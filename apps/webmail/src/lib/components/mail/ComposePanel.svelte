<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import Paperclip from '$lib/components/icons/Paperclip.svelte';
	import X from '$lib/components/icons/X.svelte';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import ComposeRecipientInput from '$lib/components/mail/ComposeRecipientInput.svelte';
	import { formatAttachmentSize } from '$lib/attachments/upload';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose, type ComposeMode } from '$lib/stores/compose.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { mailListHref, INBOX_MAILBOX_ROUTE_ID } from '$lib/mail/routes';
	import RichTextEditor from '$lib/components/mail/RichTextEditor.svelte';
	import { plainTextToSafeHtml } from '$lib/email/html';
	import { invalidAddressParts } from '$lib/utils/addresses';
	import { supportsMobileListGestures } from '$lib/utils/pointer-env';
	import TooltipWrap from '$lib/components/ui/TooltipWrap.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		mode?: ComposeMode;
		initialTo?: string;
	}

	let { mode = 'new', initialTo = '' }: Props = $props();
	let fileInput = $state<HTMLInputElement | null>(null);
	let bodyInput = $state<HTMLTextAreaElement | null>(null);
	let toInput = $state<HTMLTextAreaElement | null>(null);

	const senderName = $derived(settings.resolvedDisplayName(auth.displayName ?? auth.username));
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
		compose.scheduleAutosave(auth.client, auth.username ?? '', senderName, {
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
			if (event.key === 'Escape') void saveDraftAndClose();
		}
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	async function send() {
		if (!auth.client || !auth.username) return;
		if (invalidRecipients.length > 0 || !compose.canSend) {
			sendAttempted = true;
			return;
		}
		const destination = mailListHref(INBOX_MAILBOX_ROUTE_ID);
		const result = await compose.send(auth.client, auth.username, senderName, {
			onUndo: () => {
				const undoMode = compose.mode;
				goto(undoMode === 'new' ? '/mail/compose' : `/mail/compose?mode=${undoMode}`);
			},
			onComplete: (outcome) => {
				if (outcome === 'sent') goto(destination);
				else if (outcome === 'queued') goto(mailHomeHref);
			}
		});
		if (result === 'pending' || result === 'sent') goto(destination);
		else if (result === 'queued') goto(mailHomeHref);
	}

	async function saveDraftAndClose() {
		await compose.saveDraftAndLeave(auth.client, auth.username ?? '', senderName);
		goto(mailHomeHref);
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
		goto(mailHomeHref);
	}


	function openFilePicker() {
		fileInput?.click();
	}

	async function onFilesSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = input.files;
		if (!files?.length || !auth.client) return;
		await compose.addAttachments(auth.client, files);
		input.value = '';
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

	let dragCounter = $state(0);
	const isDragActive = $derived(dragCounter > 0);

	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		dragCounter++;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragCounter--;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragCounter = 0;
		if (!event.dataTransfer?.files?.length || !auth.client) return;
		void compose.addAttachments(auth.client, event.dataTransfer.files);
	}
</script>

<input
	bind:this={fileInput}
	type="file"
	class="hidden"
	multiple
	onchange={onFilesSelected}
/>

<section
	class="z-mail-pane-surface z-mail-pane-surface--reader z-mail-pane-surface--compose flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden relative"
	style="view-transition-name: compose-panel;"
	aria-label="Compose message"
	ondragenter={handleDragEnter}
	ondragover={(e) => e.preventDefault()}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	<div class="z-compose z-reader-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		<header class="z-compose__header flex shrink-0 flex-col border-b border-border/80">
			<div class="z-compose__header-bar flex flex-wrap items-center justify-between gap-2 px-4 py-2 min-w-0 max-md:flex-nowrap">
				<!-- Left: Back -->
				<div class="z-compose__header-leading">
					<button type="button" class="z-back-btn" aria-label="Save draft and go back" onclick={() => void saveDraftAndClose()}>
						<ArrowLeft class="size-4" aria-hidden="true" />
					</button>
					<h1 class="sr-only">{composeTitle}</h1>
					{#if draftStatus}
						<span class="z-compose__draft-status truncate" aria-live="polite">{draftStatus}</span>
					{/if}
				</div>

				<!-- Right: Actions -->
				<div class="flex items-center gap-3 shrink-0 md:gap-4">
					{#if !compose.isComposeEmpty}
						<button
							type="button"
							class="z-mail-text-nav__link z-mail-text-nav__link--danger"
							onclick={() => void discardAndClose()}
						>
							Discard
						</button>
					{/if}
					<button
						type="button"
						class="z-mail-text-nav__link"
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
						{isRichText ? 'Plain text' : 'Rich text'}
					</button>
					<button
						type="button"
						class="z-mail-text-nav__link max-md:hidden"
						onclick={openFilePicker}
					>
						Attach
					</button>
					<button
						type="button"
						class="z-icon-tap-target z-icon-tap-target--sm md:hidden"
						aria-label="Attach file"
						onclick={openFilePicker}
					>
						<Paperclip class="size-[1.125rem]" aria-hidden="true" />
					</button>
					<TooltipWrap
						label={sendBlockedReason ?? 'Send message'}
						wrapDisabled={compose.isSending || compose.hasUploadingAttachments || !compose.to.trim()}
					>
						{#snippet trigger({ props })}
							<div class="z-header-action-zone">
								<button
									{...props}
									type="submit"
									form="compose-form"
									class="z-mail-text-nav__action z-mail-text-nav__action--pill"
									disabled={compose.isSending || compose.hasUploadingAttachments || !compose.to.trim()}
								>
									{sendLabel}
								</button>
							</div>
						{/snippet}
					</TooltipWrap>
				</div>
			</div>

			{#if !settings.hideComposeHints && sendBlockedReason && compose.to.trim() && !recipientFocused}
				<div class="hidden px-4 pb-2 text-xs text-danger md:block md:px-4 md:pb-2.5" role="status">
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
	</form>
	</div>

	{#if isDragActive}
		<div class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-accent/10 border-2 border-dashed border-accent m-3 rounded-xl pointer-events-none backdrop-blur-xs transition-all">
			<div class="p-6 bg-surface border border-border rounded-xl shadow-2xl flex flex-col items-center gap-3 animate-pulse">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="size-8 text-accent">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
				</svg>
				<span class="text-sm font-semibold text-fg">Drop files here to attach</span>
			</div>
		</div>
	{/if}
</section>
