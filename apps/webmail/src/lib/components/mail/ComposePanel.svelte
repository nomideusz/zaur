<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import Paperclip from '$lib/components/icons/Paperclip.svelte';
	import X from '$lib/components/icons/X.svelte';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import RiFontSize2 from 'svelte-remixicon/RiFontSize2.svelte';
	import ComposeRecipientInput from '$lib/components/mail/ComposeRecipientInput.svelte';
	import { formatAttachmentSize } from '$lib/attachments/upload';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose, type ComposeMode } from '$lib/stores/compose.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { mailListHref, INBOX_MAILBOX_ROUTE_ID } from '$lib/mail/routes';
	import RichTextEditor from '$lib/components/mail/RichTextEditor.svelte';
	import { plainTextToSafeHtml } from '$lib/email/html';
	import { invalidAddressParts } from '$lib/utils/addresses';
	import { toast } from '$lib/stores/toast.svelte';
	import { supportsMobileListGestures } from '$lib/utils/pointer-env';
	import TooltipWrap from '$lib/components/ui/TooltipWrap.svelte';
	import ComposeFileUpload, {
		type FileUploadRejection
	} from '$lib/components/ui/ComposeFileUpload.svelte';
	import { FileUpload } from '@ark-ui/svelte/file-upload';
	import { cn } from '$lib/utils/cn';

	interface Props {
		mode?: ComposeMode;
		initialTo?: string;
		/** Floating panel / lab: stay on-page instead of navigating after close or send. */
		embedded?: boolean;
		onDismiss?: () => void;
	}

	let { mode = 'new', initialTo = '', embedded = false, onDismiss }: Props = $props();
	let bodyInput = $state<HTMLTextAreaElement | null>(null);
	let toInput = $state<HTMLInputElement | null>(null);

	// From picker: only shown when the account has more than one send-as identity.
	const showFromPicker = $derived(auth.identities.length > 1);
	const fromAddress = $derived.by(() => {
		const want = (compose.fromEmail || auth.username || '').trim().toLowerCase();
		const match = auth.identities.find((identity) => identity.email?.trim().toLowerCase() === want);
		return match?.email ?? (compose.fromEmail || auth.username || '');
	});
	const fromIdentity = $derived(
		auth.identities.find(
			(identity) => identity.email?.trim().toLowerCase() === fromAddress.trim().toLowerCase()
		)
	);
	// The user's explicitly-set Display name (settings) wins for the outgoing From; the
	// server identity name is only a fallback. Without this, a freshly-provisioned
	// account whose identity name is just its email would send the email as the name.
	const fromName = $derived(
		settings.resolvedDisplayName(fromIdentity?.name?.trim() || auth.displayName || auth.username)
	);
	const fromLabel = $derived(
		fromIdentity?.name?.trim() &&
			fromIdentity.name.trim().toLowerCase() !== fromAddress.trim().toLowerCase()
			? fromIdentity.name.trim()
			: ''
	);
	let showFromMenu = $state(false);
	let fromZone = $state<HTMLDivElement | null>(null);

	function isSelectedFrom(email: string): boolean {
		return email.trim().toLowerCase() === fromAddress.trim().toLowerCase();
	}

	const composeErrorsId = 'compose-form-errors';
	const mailHomeHref = $derived(settings.preferredMailHref());

	const quoteMarker = /\n\n---\n/;

	const quotedPart = $derived.by(() => {
		const match = compose.body.match(/\n\n---\n[\s\S]+$/);
		return match?.[0] ?? '';
	});

	/* The signature lives in the body under "-- " and is sent exactly as shown. */
	const bodyBeforeQuote = $derived.by(() => {
		const idx = compose.body.search(quoteMarker);
		return idx >= 0 ? compose.body.slice(0, idx) : compose.body;
	});

	function setMessageBody(value: string) {
		const idx = compose.body.search(quoteMarker);
		const quote = idx >= 0 ? compose.body.slice(idx) : '';
		compose.body = value + quote;
		if (!isRichText) compose.bodyHtml = '';
	}

	const titles: Record<ComposeMode, string> = {
		new: 'New message',
		reply: 'Reply',
		'reply-all': 'Reply all',
		forward: 'Forward'
	};

	const composeTitle = $derived(titles[mode] ?? 'New message');

	const draftStatus = $derived.by(() => {
		if (compose.isSavingDraft) return 'Saving draft…';
		if (compose.draftSavedAt) return 'Draft saved';
		return null;
	});

	let sendAttempted = $state(false);
	let recipientFocused = $state(false);
	let toFocused = $state(false);
	let ccFocused = $state(false);
	let bccFocused = $state(false);
	let isRichText = $state(settings.defaultComposeFormat === 'html');

	const showToPrefix = $derived(toFocused && !compose.to.trim());
	const showCcPrefix = $derived(ccFocused && !compose.cc.trim());
	const showBccPrefix = $derived(bccFocused && !compose.bcc.trim());
	const toPlaceholder = $derived(showToPrefix ? '' : 'Recipients');
	const ccPlaceholder = $derived(showCcPrefix ? '' : 'Cc');
	const bccPlaceholder = $derived(showBccPrefix ? '' : 'Bcc');

	const invalidRecipients = $derived([
		...invalidAddressParts(compose.to),
		...invalidAddressParts(compose.cc),
		...invalidAddressParts(compose.bcc)
	]);

	const sendBlockedReason = $derived.by(() => {
		if (compose.isSending) return 'Sending message…';
		if (compose.hasUploadingAttachments) return 'Wait for attachments to finish uploading.';
		if (!compose.to.trim()) return 'Add at least one recipient to send.';
		if (invalidRecipients.length) {
			return `Fix recipient ${invalidRecipients[0]} before sending.`;
		}
		if (!compose.canSend) return 'Enter a valid recipient address to send.';
		return null;
	});

	const sendLabel = $derived(
		compose.isSending ? 'Sending…' : compose.hasUploadingAttachments ? 'Uploading…' : 'Send'
	);

	$effect(() => {
		if (initialTo && mode === 'new' && !compose.to) {
			compose.to = initialTo;
		}
	});

	$effect(() => {
		compose.scheduleAutosave(auth.client, fromAddress, fromName, {
			to: compose.to,
			cc: compose.cc,
			bcc: compose.bcc,
			subject: compose.subject,
			body: compose.body,
			attachments: compose.attachments
		});
	});

	function focusComposeTarget() {
		if (mode === 'new' || mode === 'forward') {
			toInput?.focus({ preventScroll: true });
			return;
		}
		bodyInput?.focus({ preventScroll: true });
	}

	function handleComposeTouchStart(event: TouchEvent) {
		if (!supportsMobileListGestures()) return;
		const target = event.target;
		if (
			target instanceof HTMLElement &&
			target.closest('input, textarea, button, select, a, summary')
		) {
			return;
		}
		focusComposeTarget();
	}

	onMount(() => {
		void tick().then(() => {
			if (!supportsMobileListGestures()) {
				focusComposeTarget();
			}
		});

		function onKeydown(event: KeyboardEvent) {
			if (event.key !== 'Escape') return;
			if (showFromMenu) {
				showFromMenu = false;
				return;
			}
			void saveDraftAndClose();
		}
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	function dismissCompose() {
		if (embedded) onDismiss?.();
		else goto(mailHomeHref);
	}

	async function send() {
		if (!auth.client || !auth.username) return;
		if (invalidRecipients.length > 0 || !compose.canSend) {
			sendAttempted = true;
			return;
		}
		const destination = mailListHref(INBOX_MAILBOX_ROUTE_ID);
		const result = await compose.send(auth.client, fromAddress, fromName, {
			onUndo: () => {
				const undoMode = compose.mode;
				if (embedded) return;
				goto(undoMode === 'new' ? '/mail/compose' : `/mail/compose?mode=${undoMode}`);
			},
			onComplete: (outcome) => {
				if (embedded) {
					onDismiss?.();
					return;
				}
				if (outcome === 'sent') goto(destination);
				else if (outcome === 'queued') goto(mailHomeHref);
			}
		});
		if (embedded) {
			if (result === 'pending' || result === 'sent' || result === 'queued') onDismiss?.();
			return;
		}
		if (result === 'pending' || result === 'sent') goto(destination);
		else if (result === 'queued') goto(mailHomeHref);
	}

	async function saveDraftAndClose() {
		await compose.saveDraftAndLeave(auth.client, fromAddress, fromName);
		dismissCompose();
	}

	async function discardAndClose() {
		if (!compose.isComposeEmpty && settings.confirmBeforeDiscardCompose) {
			const { confirm: askConfirm } = await import('$lib/stores/confirm.svelte');
			if (
				!(await askConfirm.ask({
					title: 'Discard draft?',
					description: 'Discard this message?',
					confirmLabel: 'Discard',
					tone: 'danger'
				}))
			) {
				return;
			}
		}

		await compose.discard(auth.client);
		dismissCompose();
	}


	async function addComposeAttachments(files: File[]) {
		if (!files.length || !auth.client) return;
		await compose.addAttachments(auth.client, files);
	}

	function attachmentRejectMessage(rejections: FileUploadRejection[]): string {
		if (rejections.length === 1) {
			const entry = rejections[0];
			const code = entry.errors[0];
			if (code === 'TOO_MANY_FILES') return 'Too many attachments at once.';
			if (code === 'FILE_TOO_LARGE') return `${entry.file.name} is too large.`;
			if (code === 'FILE_INVALID_TYPE') return `${entry.file.name} is not a supported file type.`;
			if (code === 'FILE_EXISTS') return `${entry.file.name} is already attached.`;
			return `Could not attach ${entry.file.name}.`;
		}
		return `Could not attach ${rejections.length} files.`;
	}

	let showSchedulePanel = $state(false);
	let scheduleZone = $state<HTMLDivElement | null>(null);
	let customSendTime = $state('');

	const scheduleDisabled = $derived(
		compose.isSending || compose.hasUploadingAttachments || !compose.to.trim()
	);

	const schedulePresets = $derived.by(() => {
		void showSchedulePanel; // recompute relative times each time the panel opens
		const now = new Date();
		const presets: { label: string; date: Date }[] = [
			{ label: 'In 1 hour', date: new Date(now.getTime() + 3_600_000) }
		];
		const evening = new Date(now);
		evening.setHours(18, 0, 0, 0);
		if (evening.getTime() - now.getTime() > 5 * 60_000) {
			presets.push({ label: 'This evening', date: evening });
		}
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(8, 0, 0, 0);
		presets.push({ label: 'Tomorrow morning', date: tomorrow });
		return presets;
	});

	const scheduleTimeFormat = new Intl.DateTimeFormat(undefined, {
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});

	/** Local-time value for the datetime-local minimum (now + 5 minutes). */
	const customSendTimeMin = $derived.by(() => {
		void showSchedulePanel;
		const min = new Date(Date.now() + 5 * 60_000);
		min.setSeconds(0, 0);
		const pad = (value: number) => String(value).padStart(2, '0');
		return `${min.getFullYear()}-${pad(min.getMonth() + 1)}-${pad(min.getDate())}T${pad(min.getHours())}:${pad(min.getMinutes())}`;
	});

	function onWindowPointerDown(event: PointerEvent) {
		if (
			showFromMenu &&
			fromZone &&
			event.target instanceof Node &&
			!fromZone.contains(event.target)
		) {
			showFromMenu = false;
		}
		if (!showSchedulePanel) return;
		if (scheduleZone && event.target instanceof Node && !scheduleZone.contains(event.target)) {
			showSchedulePanel = false;
		}
	}

	async function scheduleSendAt(date: Date) {
		showSchedulePanel = false;
		if (!auth.client || !auth.username) return;
		if (invalidRecipients.length > 0 || !compose.canSend) {
			sendAttempted = true;
			return;
		}
		if (date.getTime() < Date.now() + 60_000) {
			toast.show('Pick a time at least a minute from now', 'error');
			return;
		}

		const result = await compose.scheduleSend(
			auth.client,
			fromAddress,
			fromName,
			date.toISOString()
		);
		if (result === 'sent') {
			toast.show(`Scheduled for ${scheduleTimeFormat.format(date)}`, 'success');
			if (embedded) onDismiss?.();
			else goto(mailListHref(INBOX_MAILBOX_ROUTE_ID));
		}
	}

	function onBodyKeydown(event: KeyboardEvent) {
		if (!settings.enableKeyboardShortcuts) return;
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			event.preventDefault();
			void send();
		}
	}

	function fieldInvalid(field: 'to' | 'cc' | 'bcc'): boolean {
		return sendAttempted && invalidAddressParts(compose[field]).length > 0;
	}
</script>

<svelte:window onpointerdown={onWindowPointerDown} />

<ComposeFileUpload
	onaccept={(files) => void addComposeAttachments(files)}
	onreject={(rejections) => toast.show(attachmentRejectMessage(rejections), 'error')}
>
	<FileUpload.Context>
		{#snippet render(fileUploadApi)}
			<FileUpload.Dropzone
				disableClick
				class={cn(
					'z-mail-pane-surface z-mail-pane-surface--reader z-mail-pane-surface--compose z-compose-dropzone relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
					embedded && 'rounded-none border-0 shadow-none'
				)}
				style={embedded ? undefined : 'view-transition-name: compose-panel;'}
				aria-label="Compose message"
				onpaste={(event) => {
					if (fileUploadApi().setClipboardFiles(event.clipboardData)) {
						event.preventDefault();
					}
				}}
			>
	<div class="z-compose z-reader-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		<header class="z-compose__header flex shrink-0 flex-col border-b border-border/80">
			<div class="z-compose__header-bar grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2 min-w-0">
				<!-- Left: Back (saves draft) -->
				<button type="button" class="z-back-btn" aria-label="Save draft and go back" onclick={() => void saveDraftAndClose()}>
					<ArrowLeft class="size-4" aria-hidden="true" />
				</button>

				<!-- Center: compose title, swapped for draft status once saving/saved -->
				<h1 class="sr-only">{composeTitle}</h1>
				<p class="z-compose__title truncate" aria-live="polite">{draftStatus ?? composeTitle}</p>

				<!-- Right: Send, with Schedule folded in as a split-button caret -->
				<div class="z-compose__send-split relative" bind:this={scheduleZone}>
					<TooltipWrap
						label={sendBlockedReason ?? 'Send message'}
						wrapDisabled={compose.isSending || compose.hasUploadingAttachments || !compose.to.trim()}
					>
						{#snippet trigger({ props })}
							<button
								{...props}
								type="submit"
								form="compose-form"
								class="z-mail-text-nav__action z-mail-text-nav__action--pill z-compose__send-main"
								disabled={compose.isSending || compose.hasUploadingAttachments || !compose.to.trim()}
							>
								{sendLabel}
							</button>
						{/snippet}
					</TooltipWrap>
					<TooltipWrap label="Schedule send" wrapDisabled={scheduleDisabled}>
						{#snippet trigger({ props })}
							<button
								{...props}
								type="button"
								class="z-mail-text-nav__action z-mail-text-nav__action--pill z-compose__send-caret"
								aria-label="Schedule send"
								aria-haspopup="menu"
								aria-expanded={showSchedulePanel}
								disabled={scheduleDisabled}
								onclick={() => (showSchedulePanel = !showSchedulePanel)}
							>
								<ChevronDown class="size-4" aria-hidden="true" />
							</button>
						{/snippet}
					</TooltipWrap>
					{#if showSchedulePanel}
						<div
							class="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-64 rounded-xl border border-border bg-surface-raised p-2 shadow-lg"
							role="menu"
							aria-label="Schedule send"
						>
							{#each schedulePresets as preset (preset.label)}
								<button
									type="button"
									class="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-fg hover:bg-surface-sunken"
									onclick={() => void scheduleSendAt(preset.date)}
								>
									<span>{preset.label}</span>
									<span class="text-xs tabular-nums text-fg-subtle">
										{scheduleTimeFormat.format(preset.date)}
									</span>
								</button>
							{/each}
							<div class="my-2 border-t border-border"></div>
							<div class="flex flex-col gap-2 px-1 pb-1">
								<label class="text-xs text-fg-muted" for="compose-schedule-custom">
									Pick date &amp; time
								</label>
								<input
									id="compose-schedule-custom"
									type="datetime-local"
									class="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-fg outline-none focus-visible:border-accent"
									min={customSendTimeMin}
									bind:value={customSendTime}
								/>
								<button
									type="button"
									class="z-mail-text-nav__action z-mail-text-nav__action--pill"
									disabled={!customSendTime}
									onclick={() => customSendTime && void scheduleSendAt(new Date(customSendTime))}
								>
									Schedule
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>

			{#if !settings.hideComposeHints && sendBlockedReason && compose.to.trim() && !recipientFocused}
				<div class="px-4 pb-2 text-xs text-danger" role="status">
					{sendBlockedReason}
				</div>
			{/if}
		</header>

	<form
		id="compose-form"
		class="z-compose__form flex min-h-0 flex-1 flex-col overflow-hidden"
		ontouchstart={handleComposeTouchStart}
		onsubmit={(event) => {
			event.preventDefault();
			void send();
		}}
	>
		<div class="z-compose__fields shrink-0 divide-y divide-border border-b border-border">
				{#if showFromPicker}
					<div class="z-compose__field">
						<span class="z-compose__prefix">From</span>
						<div class="relative min-w-0" bind:this={fromZone}>
							<button
								type="button"
								id="compose-from"
								class="z-compose-field-input flex w-full items-center justify-between gap-2 text-left"
								aria-haspopup="listbox"
								aria-expanded={showFromMenu}
								onclick={() => (showFromMenu = !showFromMenu)}
							>
								<span class="min-w-0 truncate">
									{#if fromLabel}
										<span class="font-medium text-fg">{fromLabel}</span>
										<span class="ml-1 text-fg-muted">{fromAddress}</span>
									{:else}
										<span class="text-fg">{fromAddress}</span>
									{/if}
								</span>
								<ChevronDown class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
							</button>

							{#if showFromMenu}
								<ul
									class="absolute left-0 top-full z-20 mt-2 w-full max-w-md overflow-hidden rounded-md border border-border bg-surface-raised shadow-md"
									role="listbox"
									aria-label="Send from"
								>
									{#each auth.identities as identity (identity.id)}
										<li>
											<button
												type="button"
												role="option"
												aria-selected={isSelectedFrom(identity.email)}
												class={cn(
													'flex w-full cursor-pointer select-none items-center gap-2 px-3 py-2 text-left text-sm outline-none hover:bg-surface-sunken',
													isSelectedFrom(identity.email) && 'bg-surface-sunken'
												)}
												onclick={() => {
													compose.fromEmail = identity.email;
													showFromMenu = false;
												}}
											>
												<span class="min-w-0 truncate">
													<span class="font-medium text-fg">
														{identity.name?.trim() || identity.email}
													</span>
													{#if identity.name?.trim() && identity.name.trim().toLowerCase() !== identity.email.trim().toLowerCase()}
														<span class="ml-1 text-fg-muted">{identity.email}</span>
													{/if}
												</span>
											</button>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					</div>
				{/if}
				<div class={cn('z-compose__field', fieldInvalid('to') && 'z-compose__field--invalid')}>
					<label class="sr-only" for="compose-to">To</label>
					<span class="z-compose__prefix" aria-hidden={!showToPrefix}>{showToPrefix ? 'To' : ''}</span>
					<ComposeRecipientInput
						id="compose-to"
						bind:inputElement={toInput}
						value={compose.to}
						placeholder={toPlaceholder}
						autocomplete="email"
						class="z-compose__input"
						invalid={fieldInvalid('to')}
						ariaDescribedby={compose.error || (sendAttempted && invalidRecipients.length) ? composeErrorsId : undefined}
						oninput={(value) => {
							compose.to = value;
							sendAttempted = false;
						}}
						onfocus={() => {
							toFocused = true;
							recipientFocused = true;
						}}
						onblur={() => {
							toFocused = false;
							recipientFocused = false;
						}}
					/>
					{#if settings.showCcBccInCompose && !compose.showCcBcc}
						<button
							type="button"
							class="z-compose__suffix-link"
							tabindex="-1"
							onclick={() => (compose.showCcBcc = true)}
						>
							Cc/Bcc
						</button>
					{/if}
				</div>

				{#if compose.showCcBcc && (settings.showCcBccInCompose || compose.cc.trim() || compose.bcc.trim())}
					<div class={cn('z-compose__field', fieldInvalid('cc') && 'z-compose__field--invalid')}>
						<label class="sr-only" for="compose-cc">Cc</label>
						<span class="z-compose__prefix" aria-hidden={!showCcPrefix}>{showCcPrefix ? 'Cc' : ''}</span>
						<ComposeRecipientInput
							id="compose-cc"
							value={compose.cc}
							placeholder={ccPlaceholder}
							autocomplete="email"
							class="z-compose__input"
							invalid={fieldInvalid('cc')}
							ariaDescribedby={compose.error || (sendAttempted && invalidRecipients.length) ? composeErrorsId : undefined}
							oninput={(value) => {
								compose.cc = value;
								sendAttempted = false;
							}}
							onfocus={() => {
								ccFocused = true;
								recipientFocused = true;
							}}
							onblur={() => {
								ccFocused = false;
								recipientFocused = false;
							}}
						/>
					</div>
					<div class={cn('z-compose__field', fieldInvalid('bcc') && 'z-compose__field--invalid')}>
						<label class="sr-only" for="compose-bcc">Bcc</label>
						<span class="z-compose__prefix" aria-hidden={!showBccPrefix}>{showBccPrefix ? 'Bcc' : ''}</span>
						<ComposeRecipientInput
							id="compose-bcc"
							value={compose.bcc}
							placeholder={bccPlaceholder}
							autocomplete="email"
							class="z-compose__input"
							invalid={fieldInvalid('bcc')}
							ariaDescribedby={compose.error || (sendAttempted && invalidRecipients.length) ? composeErrorsId : undefined}
							oninput={(value) => {
								compose.bcc = value;
								sendAttempted = false;
							}}
							onfocus={() => {
								bccFocused = true;
								recipientFocused = true;
							}}
							onblur={() => {
								bccFocused = false;
								recipientFocused = false;
							}}
						/>
					</div>
				{/if}

				<div class="z-compose__field z-compose__field--subject">
					<label class="sr-only" for="compose-subject">Subject</label>
					<input
						id="compose-subject"
						type="text"
						class="z-compose__input"
						placeholder="Subject"
						autocomplete="off"
						bind:value={compose.subject}
					/>
				</div>
			</div>

		{#if compose.attachments.length}
			<ul class="z-compose-attachment-list shrink-0 border-b border-border" aria-label="Attachments">
				{#each compose.attachments as attachment (attachment.id)}
					<li class="z-compose-attachment-item">
						<div class="flex min-w-0 flex-1 items-center gap-2 text-sm">
							<Paperclip class="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
							<span class="min-w-0 truncate font-medium text-fg">{attachment.name}</span>
							<span class="shrink-0 text-xs text-fg-subtle">
								({formatAttachmentSize(attachment.size)})
							</span>
							{#if attachment.uploading}
								<span class="text-xs text-fg-subtle">Uploading…</span>
							{:else if attachment.uploadError}
								<span class="text-xs text-danger">Failed</span>
							{/if}
						</div>
						<button
							type="button"
							class="z-icon-tap-target z-icon-tap-target--sm"
							aria-label="Remove {attachment.name}"
							onclick={() => compose.removeAttachment(attachment.id)}
						>
							<X class="size-3.5" aria-hidden="true" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="z-compose__write flex min-h-0 flex-1 flex-col px-4" style="padding-block: var(--z-space-reader-content-compact);">
			<label class="sr-only" for="compose-body">Message</label>
			{#if isRichText}
				<RichTextEditor
					bind:htmlValue={compose.bodyHtml}
					bind:textValue={compose.body}
					onchange={() => {
						sendAttempted = false;
					}}
				/>
			{:else}
				<textarea
					id="compose-body"
					bind:this={bodyInput}
					class="z-compose__body min-h-0 flex-1 resize-none"
					value={bodyBeforeQuote}
					oninput={(event) => setMessageBody(event.currentTarget.value)}
					onkeydown={onBodyKeydown}
				></textarea>
			{/if}
		</div>

			{#if quotedPart && !isRichText}
				<details class="z-compose__quote" open={!settings.collapseQuotedInCompose}>
					<summary>Quoted message</summary>
					<pre>{quotedPart.trim()}</pre>
				</details>
			{/if}



		{#if compose.error || (sendAttempted && invalidRecipients.length)}
			<p id={composeErrorsId} class="shrink-0 px-4 py-2 text-sm text-danger" role="alert">
				{compose.error ?? `Check recipient: ${invalidRecipients[0]}`}
			</p>
		{/if}

		<!-- Composition tools — kept out of the send header and in one icon language. -->
		<div class="z-compose__tools flex shrink-0 items-center gap-1 border-t border-border px-4 py-1.5">
			<TooltipWrap label={isRichText ? 'Switch to plain text' : 'Switch to rich text'}>
				{#snippet trigger({ props })}
					<button
						{...props}
						type="button"
						class={cn('z-icon-tap-target z-icon-tap-target--sm', isRichText && 'text-accent')}
						aria-label={isRichText ? 'Switch to plain text' : 'Switch to rich text'}
						aria-pressed={isRichText}
						onclick={() => {
							isRichText = !isRichText;
							if (isRichText) {
								if (!compose.bodyHtml) {
									compose.bodyHtml = plainTextToSafeHtml(compose.body);
								}
								compose.ensureInlineAttachmentsFromHtml(compose.bodyHtml);
							}
						}}
					>
						<RiFontSize2 size="18" aria-hidden="true" />
					</button>
				{/snippet}
			</TooltipWrap>
			<TooltipWrap label="Attach file">
				{#snippet trigger({ props })}
					<FileUpload.Trigger
						{...props}
						type="button"
						class="z-icon-tap-target z-icon-tap-target--sm"
						aria-label="Attach file"
					>
						<Paperclip class="size-[1.125rem]" aria-hidden="true" />
					</FileUpload.Trigger>
				{/snippet}
			</TooltipWrap>

			<div class="flex-1"></div>

			{#if !compose.isComposeEmpty}
				<TooltipWrap label="Discard draft">
					{#snippet trigger({ props })}
						<button
							{...props}
							type="button"
							class="z-icon-tap-target z-icon-tap-target--sm hover:text-danger"
							aria-label="Discard draft"
							onclick={() => void discardAndClose()}
						>
							<Trash2 class="size-[1.125rem]" aria-hidden="true" />
						</button>
					{/snippet}
				</TooltipWrap>
			{/if}
		</div>
	</form>
	</div>

	<div class="z-compose-drop-hint pointer-events-none" aria-hidden="true">
		<div class="z-compose-drop-hint__card">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="size-8 text-accent">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
			</svg>
			<span class="text-sm font-semibold text-fg">Drop files here to attach</span>
		</div>
	</div>
	</FileUpload.Dropzone>
		{/snippet}
	</FileUpload.Context>
</ComposeFileUpload>
