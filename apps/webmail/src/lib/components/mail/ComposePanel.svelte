<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import Paperclip from '$lib/components/icons/Paperclip.svelte';
	import X from '$lib/components/icons/X.svelte';
	import ComposeRecipientInput from '$lib/components/mail/ComposeRecipientInput.svelte';
	import { formatAttachmentSize } from '$lib/attachments/upload';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose, type ComposeMode } from '$lib/stores/compose.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { mailListHref, INBOX_MAILBOX_ROUTE_ID } from '$lib/mail/routes';
	import { contentPagePadClass } from '$lib/mail/layout';
	import { invalidAddressParts } from '$lib/utils/addresses';
	import { supportsMobileListGestures } from '$lib/utils/pointer-env';
	import { cn } from '$lib/utils/cn';

	interface Props {
		mode?: ComposeMode;
		initialTo?: string;
	}

	let { mode = 'new', initialTo = '' }: Props = $props();
	let fileInput = $state<HTMLInputElement | null>(null);
	let bodyInput = $state<HTMLTextAreaElement | null>(null);
	let toInput = $state<HTMLInputElement | null>(null);

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

	const composeTitle = $derived(
		compose.jmapDraftId ? 'Edit draft' : (titles[mode] ?? 'New message')
	);

	const draftStatus = $derived.by(() => {
		if (compose.isSavingDraft) return 'Saving draft…';
		if (compose.draftSavedAt) return 'Draft saved';
		return null;
	});

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
			if (event.key === 'Escape') close();
		}
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	async function send() {
		if (!auth.client || !auth.username) return;
		if (showSignature && configuredSignature) {
			rebuildComposeBody(messageBody, signatureBody || configuredSignature);
		}
		const destination = settings.returnToInboxAfterSend
			? mailListHref(INBOX_MAILBOX_ROUTE_ID)
			: mailListHref('sent');
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

	function close() {
		const hasContent = !compose.isComposeEmpty;

		if (hasContent && settings.confirmBeforeDiscardCompose && !confirm('Discard this message?')) {
			return;
		}

		void compose.discard(auth.client);
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
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			event.preventDefault();
			void send();
		}
	}

	function fieldInvalid(field: 'to' | 'cc' | 'bcc'): boolean {
		return invalidRecipients.length > 0 && invalidAddressParts(compose[field]).length > 0;
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

<section class="z-compose" aria-label="Compose message">
	<div class={cn(contentPagePadClass(), 'z-compose__page')}>
		<div class="z-mail-text-nav z-compose__nav">
			<h1 class="sr-only">{composeTitle}</h1>
			<div class="z-mail-text-nav__row">
				<button type="button" class="z-mail-text-nav__link" onclick={close}>Discard</button>
				<div class="z-mail-text-nav__links">
					<button type="button" class="z-mail-text-nav__link" onclick={openFilePicker}>
						Attach file
					</button>
					<button
						type="submit"
						form="compose-form"
						class="z-mail-text-nav__action z-compose__nav-send"
						disabled={!compose.canSend || invalidRecipients.length > 0}
						title={sendBlockedReason ?? 'Send message'}
					>
						{sendLabel}
					</button>
				</div>
			</div>
			{#if !settings.hideComposeHints}
				<div class="flex items-center justify-between gap-4 z-compose__draft-status">
					<p aria-live="polite">
						{draftStatus ?? ''}
					</p>
					{#if sendBlockedReason && compose.to.trim()}
						<p class="text-fg-subtle" role="status">
							{sendBlockedReason}
						</p>
					{/if}
				</div>
			{/if}
		</div>

		<form
			id="compose-form"
			class="z-compose__form"
			ontouchstart={handleComposeTouchStart}
			onsubmit={(event) => {
				event.preventDefault();
				void send();
			}}
		>
			<div class="z-compose__fields">
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
							ariaDescribedby={compose.error || invalidRecipients.length ? composeErrorsId : undefined}
							oninput={(value) => (compose.to = value)}
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
								ariaDescribedby={compose.error || invalidRecipients.length ? composeErrorsId : undefined}
								oninput={(value) => (compose.cc = value)}
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
								ariaDescribedby={compose.error || invalidRecipients.length ? composeErrorsId : undefined}
								oninput={(value) => (compose.bcc = value)}
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

			<div class="z-compose__write">
				<div class="z-compose__message">
					<label class="sr-only" for="compose-body">Message</label>
					<textarea
						id="compose-body"
						bind:this={bodyInput}
						class="z-compose__body"
						value={messageBody}
						oninput={(event) => setMessageBody(event.currentTarget.value)}
						onkeydown={onBodyKeydown}
					></textarea>
				</div>
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
						<div class="flex gap-4 mt-2">
							<button type="button" class="z-mail-text-nav__link" onclick={saveSignatureInline}>
								Save signature
							</button>
							<button
								type="button"
								class="z-mail-text-nav__link text-fg-subtle"
								onclick={() => (isAddingSignatureInline = false)}
							>
								Cancel
							</button>
						</div>
					</div>
				{:else if !settings.hideComposeHints}
					<p class="z-compose__signature-empty">
						<button
							type="button"
							class="z-mail-text-nav__link"
							onclick={() => {
								isAddingSignatureInline = true;
								newSignatureInline = '';
							}}
						>
							Add a signature
						</button>
					</p>
				{/if}
			{/if}

			{#if quotedPart}
				<details class="z-compose__quote" open={!settings.collapseQuotedInCompose}>
					<summary>Quoted message</summary>
					<pre>{quotedPart.trim()}</pre>
				</details>
			{/if}

			{#if compose.attachments.length}
				<ul class="z-compose-attachment-list" aria-label="Attachments">
					{#each compose.attachments as attachment (attachment.id)}
						<li class="z-compose-attachment-item">
							<div class="flex min-w-0 flex-1 items-center gap-2">
								<Paperclip class="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
								<span class="z-type-page-muted min-w-0 truncate text-fg font-medium">{attachment.name}</span>
								<span class="z-type-page-muted shrink-0 text-fg-subtle">
									({formatAttachmentSize(attachment.size)})
								</span>
								{#if attachment.uploading}
									<span class="z-type-page-muted text-fg-subtle">Uploading…</span>
								{:else if attachment.uploadError}
									<span class="z-type-page-muted text-danger">Failed</span>
								{/if}
							</div>
							<button
								type="button"
								class="inline-flex shrink-0 items-center text-fg-subtle transition-colors hover:text-fg ml-2"
								aria-label="Remove {attachment.name}"
								onclick={() => compose.removeAttachment(attachment.id)}
							>
								<X class="size-3.5" aria-hidden="true" />
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			{#if compose.error || invalidRecipients.length}
				<p id={composeErrorsId} class="z-type-page-muted mt-4 text-danger" role="alert">
					{compose.error ?? `Check recipient: ${invalidRecipients[0]}`}
				</p>
			{/if}
		</form>


	</div>
</section>
