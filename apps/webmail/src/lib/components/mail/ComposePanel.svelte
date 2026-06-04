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
	import { invalidAddressParts } from '$lib/utils/addresses';
	import { supportsMobileListGestures } from '$lib/utils/pointer-env';
	import Button from '$lib/components/ui/Button.svelte';
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

	const configuredSignature = $derived(settings.signature.trim());

	const showSignature = $derived(settings.useSignature);

	const quotedPart = $derived.by(() => {
		const match = compose.body.match(/\n\n---\n[\s\S]+$/);
		return match?.[0] ?? '';
	});

	const bodyBeforeQuote = $derived.by(() => {
		const idx = compose.body.search(quoteMarker);
		return idx >= 0 ? compose.body.slice(0, idx) : compose.body;
	});

	const composeBodyParts = $derived.by(() => {
		const beforeQuote = bodyBeforeQuote;
		if (!showSignature) {
			return { message: beforeQuote, signature: '' };
		}

		if (!configuredSignature) {
			return { message: beforeQuote, signature: '' };
		}

		const trimmedEnd = beforeQuote.trimEnd();
		if (trimmedEnd === configuredSignature) {
			return { message: '', signature: configuredSignature };
		}
		if (trimmedEnd.endsWith(configuredSignature)) {
			const message = beforeQuote
				.slice(0, beforeQuote.length - configuredSignature.length)
				.replace(/\s+$/, '');
			return { message, signature: configuredSignature };
		}

		const splitAt = beforeQuote.lastIndexOf('\n\n');
		if (splitAt >= 0) {
			const maybeSignature = beforeQuote.slice(splitAt + 2).trimEnd();
			if (maybeSignature) {
				return {
					message: beforeQuote.slice(0, splitAt),
					signature: maybeSignature
				};
			}
		}

		return { message: beforeQuote, signature: configuredSignature };
	});

	const messageBody = $derived(composeBodyParts.message);
	const signatureBody = $derived(composeBodyParts.signature);

	function rebuildComposeBody(message: string, signature: string) {
		const idx = compose.body.search(quoteMarker);
		const quote = idx >= 0 ? compose.body.slice(idx) : '';
		const sigBlock = showSignature && signature.trim() ? `\n\n${signature.trimEnd()}` : '';
		compose.body = message + sigBlock + quote;
	}

	function setMessageBody(value: string) {
		rebuildComposeBody(value, signatureBody);
	}

	function setSignatureBody(value: string) {
		rebuildComposeBody(messageBody, value);
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

	let toBlurred = $state(false);
	let ccBlurred = $state(false);
	let bccBlurred = $state(false);
	let sendAttempted = $state(false);

	const showToError = $derived(sendAttempted || toBlurred);
	const showCcError = $derived(sendAttempted || ccBlurred);
	const showBccError = $derived(sendAttempted || bccBlurred);
	const showAnyError = $derived(sendAttempted || toBlurred || ccBlurred || bccBlurred);

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
		if (!showSignature || !configuredSignature) return;
		const beforeQuote = bodyBeforeQuote;
		const trimmed = beforeQuote.trimEnd();
		if (
			trimmed === configuredSignature ||
			trimmed.endsWith(`\n\n${configuredSignature}`) ||
			trimmed.endsWith(configuredSignature)
		) {
			return;
		}
		rebuildComposeBody(messageBody, signatureBody || configuredSignature);
	});

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
		if (showSignature && configuredSignature) {
			rebuildComposeBody(messageBody, signatureBody || configuredSignature);
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
		if (
			!compose.isComposeEmpty &&
			settings.confirmBeforeDiscardCompose &&
			!confirm('Discard this message?')
		) {
			return;
		}

		await compose.discard(auth.client);
		goto(mailHomeHref);
	}

	const leaveLabel = $derived(compose.isComposeEmpty ? 'Close' : 'Save draft');

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
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			event.preventDefault();
			void send();
		}
	}

	function fieldInvalid(field: 'to' | 'cc' | 'bcc'): boolean {
		const showErr = field === 'to' ? showToError : field === 'cc' ? showCcError : showBccError;
		return showErr && invalidAddressParts(compose[field]).length > 0;
	}

	let isAddingSignatureInline = $state(false);
	let newSignatureInline = $state('');

	function saveSignatureInline() {
		const signature = newSignatureInline.trim();
		if (signature) {
			settings.setSignature(signature);
			rebuildComposeBody(messageBody, signature);
		}
		isAddingSignatureInline = false;
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
	class="z-mail-pane-surface z-mail-pane-surface--reader flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
	style="view-transition-name: compose-panel;"
	aria-label="Compose message"
>
	<div class="z-compose z-reader-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		<header class="flex shrink-0 flex-col gap-2 border-b border-border/80 px-4 py-2.5">
			<div class="flex flex-wrap items-center justify-between gap-4 min-w-0">
				<!-- Left: Close & Title -->
				<div class="flex items-center gap-3 min-w-0">
					<Button type="button" variant="ghost" class="shrink-0" onclick={() => void saveDraftAndClose()}>
						<ArrowLeft class="size-4" aria-hidden="true" />
						{leaveLabel}
					</Button>
					<div class="flex items-baseline gap-2 min-w-0">
						<h1 class="z-type-pane-title truncate">{composeTitle}</h1>
						{#if draftStatus}
							<span class="text-xs text-fg-subtle shrink-0" aria-live="polite">({draftStatus.toLowerCase()})</span>
						{/if}
					</div>
				</div>

				<!-- Right: Actions -->
				<div class="flex items-center gap-2 shrink-0">
					{#if !compose.isComposeEmpty}
						<Button type="button" variant="ghost" onclick={() => void discardAndClose()}>
							Discard
						</Button>
					{/if}
					<Button type="button" variant="ghost" onclick={openFilePicker}>
						<Paperclip class="size-4" aria-hidden="true" />
						Attach
					</Button>
					<Button
						type="submit"
						form="compose-form"
						disabled={compose.isSending || compose.hasUploadingAttachments || !compose.to.trim()}
						title={sendBlockedReason ?? 'Send message'}
					>
						{sendLabel}
					</Button>
				</div>
			</div>

			{#if !settings.hideComposeHints && sendBlockedReason && compose.to.trim()}
				<div class="text-xs text-danger" role="status">
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
					<label class="z-compose__label" for="compose-to">To</label>
					<div class="z-compose__control">
						<ComposeRecipientInput
							id="compose-to"
							bind:inputElement={toInput}
							value={compose.to}
							autocomplete="email"
							class="z-compose__input"
							invalid={fieldInvalid('to')}
							ariaDescribedby={compose.error || (showAnyError && invalidRecipients.length) ? composeErrorsId : undefined}
							oninput={(value) => (compose.to = value)}
							onblur={() => (toBlurred = true)}
						/>
						{#if settings.showCcBccInCompose && !compose.showCcBcc}
							<button
								type="button"
								class="z-compose__inline-link"
								tabindex="-1"
								onclick={() => (compose.showCcBcc = true)}
							>
								Cc/Bcc
							</button>
						{/if}
					</div>
				</div>

				{#if compose.showCcBcc && (settings.showCcBccInCompose || compose.cc.trim() || compose.bcc.trim())}
					<div class={cn('z-compose__field', fieldInvalid('cc') && 'z-compose__field--invalid')}>
						<label class="z-compose__label" for="compose-cc">Cc</label>
						<div class="z-compose__control">
							<ComposeRecipientInput
								id="compose-cc"
								value={compose.cc}
								autocomplete="email"
								class="z-compose__input"
								invalid={fieldInvalid('cc')}
								ariaDescribedby={compose.error || (showAnyError && invalidRecipients.length) ? composeErrorsId : undefined}
								oninput={(value) => (compose.cc = value)}
								onblur={() => (ccBlurred = true)}
							/>
						</div>
					</div>
					<div class={cn('z-compose__field', fieldInvalid('bcc') && 'z-compose__field--invalid')}>
						<label class="z-compose__label" for="compose-bcc">Bcc</label>
						<div class="z-compose__control">
							<ComposeRecipientInput
								id="compose-bcc"
								value={compose.bcc}
								autocomplete="email"
								class="z-compose__input"
								invalid={fieldInvalid('bcc')}
								ariaDescribedby={compose.error || (showAnyError && invalidRecipients.length) ? composeErrorsId : undefined}
								oninput={(value) => (compose.bcc = value)}
								onblur={() => (bccBlurred = true)}
							/>
						</div>
					</div>
				{/if}

				<div class="z-compose__field z-compose__field--subject">
					<label class="z-compose__label" for="compose-subject">Subject</label>
					<div class="z-compose__control">
						<input
							id="compose-subject"
							type="text"
							class="z-compose__input"
							bind:value={compose.subject}
						/>
					</div>
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
			<textarea
				id="compose-body"
				bind:this={bodyInput}
				class="z-compose__body min-h-0 flex-1 resize-none"
				placeholder="Write your message…"
				value={messageBody}
				oninput={(event) => setMessageBody(event.currentTarget.value)}
				onkeydown={onBodyKeydown}
			></textarea>
		</div>

			{#if showSignature}
				{#if configuredSignature || signatureBody}
					<div class="z-compose__signature">
						<label class="sr-only" for="compose-signature">Signature</label>
						<textarea
							id="compose-signature"
							class="z-compose__signature-input"
							rows={Math.max(3, (signatureBody || configuredSignature).split('\n').length)}
							value={signatureBody || configuredSignature}
							oninput={(event) => setSignatureBody(event.currentTarget.value)}
						></textarea>
					</div>
				{:else if isAddingSignatureInline}
					<div class="z-compose__signature">
						<label class="sr-only" for="compose-signature-inline">New signature</label>
						<textarea
							id="compose-signature-inline"
							class="z-compose__signature-input"
							placeholder="Write your signature..."
							bind:value={newSignatureInline}
						></textarea>
						<div class="mt-2 flex gap-2">
							<Button type="button" variant="ghost" onclick={saveSignatureInline}>Save signature</Button>
							<Button
								type="button"
								variant="ghost"
								onclick={() => (isAddingSignatureInline = false)}
							>
								Cancel
							</Button>
						</div>
					</div>
				{:else if !settings.hideComposeHints}
					<p class="z-compose__signature-empty">
						<Button
							type="button"
							variant="ghost"
							onclick={() => {
								isAddingSignatureInline = true;
								newSignatureInline = '';
							}}
						>
							Add a signature
						</Button>
					</p>
				{/if}
			{/if}

			{#if quotedPart}
				<details class="z-compose__quote" open={!settings.collapseQuotedInCompose}>
					<summary>Quoted message</summary>
					<pre>{quotedPart.trim()}</pre>
				</details>
			{/if}



		{#if compose.error || (showAnyError && invalidRecipients.length)}
			<p id={composeErrorsId} class="shrink-0 px-4 py-2 text-sm text-danger" role="alert">
				{compose.error ?? `Check recipient: ${invalidRecipients[0]}`}
			</p>
		{/if}
	</form>
	</div>
</section>
