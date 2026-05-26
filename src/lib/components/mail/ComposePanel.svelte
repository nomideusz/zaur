<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Paperclip, X } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ComposeAttachments from '$lib/components/mail/ComposeAttachments.svelte';
	import ComposeRecipientInput from '$lib/components/mail/ComposeRecipientInput.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose, type ComposeMode } from '$lib/stores/compose.svelte';
	import { settings, type ComposeDrawerWidth } from '$lib/stores/settings.svelte';
	import { invalidAddressParts } from '$lib/utils/addresses';
	import { cn } from '$lib/utils/cn';

	const DRAWER_WIDTH_CLASS: Record<ComposeDrawerWidth, string> = {
		narrow: 'max-w-xl',
		default: 'max-w-2xl',
		wide: 'max-w-3xl'
	};

	const senderName = $derived(settings.resolvedDisplayName(auth.displayName ?? auth.username));
	const senderEmail = $derived(auth.username ?? '');
	const fieldLabelClass = $derived(
		settings.hideComposeFieldLabels ? 'sr-only' : 'w-14 shrink-0 text-fg-subtle'
	);
	const composeBorderB = $derived(settings.hideComposePanelBorders ? '' : 'border-b border-border');
	const composeBorderT = $derived(settings.hideComposePanelBorders ? '' : 'border-t border-border');
	const hideBorders = $derived(settings.hideComposePanelBorders || settings.hidePaneBorders);

	function panelShellClass(variant: 'drawer' | 'pane'): string {
		if (variant === 'pane') {
			return cn(
				'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface-raised',
				!hideBorders && 'border-l border-border'
			);
		}

		return cn(
			'z-panel flex h-full min-h-0 w-full flex-col overflow-hidden shadow-md',
			!hideBorders && 'border-l',
			DRAWER_WIDTH_CLASS[settings.composeDrawerWidth]
		);
	}

	interface Props {
		mode?: ComposeMode;
		initialTo?: string;
	}

	let { mode = 'new', initialTo = '' }: Props = $props();
	let fileInput = $state<HTMLInputElement | null>(null);
	let bodyInput = $state<HTMLTextAreaElement | null>(null);
	let toInput = $state<HTMLInputElement | null>(null);
	let composeDesktop = $state(false);

	const usePaneLayout = $derived(settings.composeLayout === 'pane');
	const showPaneShell = $derived(usePaneLayout && composeDesktop);

	const quoteMarker = /\n\n---\n/;

	const quotedPart = $derived.by(() => {
		const match = compose.body.match(/\n\n---\n[\s\S]+$/);
		return match?.[0] ?? '';
	});

	const editableBody = $derived.by(() => {
		const idx = compose.body.search(quoteMarker);
		return idx >= 0 ? compose.body.slice(0, idx) : compose.body;
	});

	function setEditableBody(value: string) {
		const idx = compose.body.search(quoteMarker);
		compose.body = idx >= 0 ? value + compose.body.slice(idx) : value;
	}

	const titles: Record<ComposeMode, string> = {
		new: 'New message',
		reply: 'Reply',
		'reply-all': 'Reply all',
		forward: 'Forward'
	};

	const title = $derived(
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

	$effect(() => {
		if (initialTo && mode === 'new' && !compose.to) {
			compose.to = initialTo;
		}
	});

	$effect(() => {
		compose.to;
		compose.cc;
		compose.bcc;
		compose.subject;
		compose.body;
		compose.attachments;
		compose.scheduleAutosave(auth.client, auth.username ?? '', senderName);
	});

	$effect(() => {
		mode;
		queueMicrotask(() => {
			if (mode === 'new' || mode === 'forward') {
				toInput?.focus();
			} else {
				bodyInput?.focus();
			}
		});
	});

	onMount(() => {
		const media = window.matchMedia('(min-width: 768px)');

		function syncDesktop() {
			composeDesktop = media.matches;
		}

		syncDesktop();
		media.addEventListener('change', syncDesktop);

		function onKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') close();
		}
		window.addEventListener('keydown', onKeydown);

		return () => {
			media.removeEventListener('change', syncDesktop);
			window.removeEventListener('keydown', onKeydown);
		};
	});

	async function send() {
		if (!auth.client || !auth.username) return;
		const destination = settings.returnToInboxAfterSend ? '/mail/inbox' : '/mail/sent';
		const result = await compose.send(auth.client, auth.username, senderName, {
			onUndo: () => {
				const mode = compose.mode;
				goto(mode === 'new' ? '/mail/compose' : `/mail/compose?mode=${mode}`);
			},
			onComplete: (outcome) => {
				if (outcome === 'sent') goto(destination);
				else if (outcome === 'queued') goto(settings.preferredMailHref());
			}
		});
		if (result === 'pending' || result === 'sent') goto(destination);
		else if (result === 'queued') goto(settings.preferredMailHref());
	}

	function close() {
		const hasContent =
			compose.to.trim() ||
			compose.cc.trim() ||
			compose.bcc.trim() ||
			compose.subject.trim() ||
			compose.body.trim() ||
			compose.attachments.length;

		if (hasContent && settings.confirmBeforeDiscardCompose && !confirm('Discard this message?')) return;

		compose.reset();
		goto(settings.preferredMailHref());
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

	function onKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			event.preventDefault();
			void send();
		}
	}
</script>

<input
	bind:this={fileInput}
	type="file"
	class="hidden"
	multiple
	onchange={onFilesSelected}
/>

{#snippet composePanel(variant: 'drawer' | 'pane')}
	<div
		class={panelShellClass(variant)}
	>
		<header class={cn('flex shrink-0 items-center justify-between px-5 py-3.5', composeBorderB)}>
			<div>
				<h2 class="text-base font-semibold text-fg">{title}</h2>
				{#if !settings.hideComposeHints && draftStatus}
					<p class="text-xs text-fg-subtle">{draftStatus}</p>
				{/if}
			</div>
			<IconButton label="Close compose" onclick={close}>
				<X class="size-4" />
			</IconButton>
		</header>

		<form
			class="flex min-h-0 flex-1 flex-col overflow-hidden"
			onsubmit={(e) => {
				e.preventDefault();
				void send();
			}}
		>
			<div class={cn('shrink-0 space-y-0 bg-surface/50', composeBorderB)}>
				{#if !settings.hideComposeFromLine}
				<div class={cn('flex items-center gap-3 px-5 py-2.5 text-sm', composeBorderB)}>
					<span class={fieldLabelClass}>From</span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-fg">
							{senderName}
							{#if senderEmail}
								<span class="text-fg-muted">&lt;{senderEmail}&gt;</span>
							{/if}
						</p>
						{#if !settings.hideComposeHints && !settings.displayName.trim()}
							<a href="/settings/account" class="text-xs text-fg-subtle hover:text-accent hover:underline">
								Set display name
							</a>
						{/if}
					</div>
				</div>
				{/if}

				<div class={cn('flex items-center gap-3 px-5 py-2.5 text-sm', composeBorderB)}>
					<span class={fieldLabelClass}>To</span>
					<ComposeRecipientInput
						bind:inputElement={toInput}
						value={compose.to}
						placeholder="recipient@example.com"
						autocomplete="email"
						oninput={(value) => (compose.to = value)}
					/>
					{#if settings.showCcBccInCompose && !compose.showCcBcc}
						<button
							type="button"
							class="shrink-0 text-xs text-accent hover:underline"
							onclick={() => (compose.showCcBcc = true)}
						>
							Cc/Bcc
						</button>
					{/if}
				</div>

				{#if compose.showCcBcc && (settings.showCcBccInCompose || compose.cc.trim() || compose.bcc.trim())}
					<div class={cn('flex items-center gap-3 px-5 py-2.5 text-sm', composeBorderB)}>
						<span class={fieldLabelClass}>Cc</span>
						<ComposeRecipientInput
							value={compose.cc}
							placeholder="cc@example.com"
							autocomplete="email"
							oninput={(value) => (compose.cc = value)}
						/>
					</div>
					<label class={cn('flex items-center gap-3 px-5 py-2.5 text-sm', composeBorderB)}>
						<span class={fieldLabelClass}>Bcc</span>
						<ComposeRecipientInput
							value={compose.bcc}
							placeholder="bcc@example.com"
							autocomplete="email"
							oninput={(value) => (compose.bcc = value)}
						/>
					</label>
				{/if}

				<label class="flex items-center gap-3 px-5 py-2.5 text-sm">
					<span class={fieldLabelClass}>Subject</span>
					<input
						type="text"
						class="flex-1 bg-transparent outline-none placeholder:text-fg-subtle"
						placeholder="Subject (optional)"
						bind:value={compose.subject}
					/>
				</label>
			</div>

			<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
				<textarea
					bind:this={bodyInput}
					class="z-compose-editor min-h-0 flex-1 resize-none bg-transparent px-5 py-4 leading-relaxed outline-none placeholder:text-fg-subtle"
					placeholder="Write your message…"
					value={editableBody}
					oninput={(e) => setEditableBody(e.currentTarget.value)}
					onkeydown={onKeydown}
				></textarea>

				{#if quotedPart}
					<details class={cn('shrink-0 bg-surface/50 px-5 py-2', composeBorderT)} open={!settings.collapseQuotedInCompose}>
						<summary class="cursor-pointer text-xs font-medium text-fg-muted">Quoted message</summary>
						<pre class="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-fg-subtle">{quotedPart.trim()}</pre>
					</details>
				{/if}
			</div>

			<ComposeAttachments />

			{#if compose.error || invalidRecipients.length}
				<p class={cn('px-5 py-2 text-sm text-danger', composeBorderT)} role="alert">
					{compose.error ?? `Check recipient: ${invalidRecipients[0]}`}
				</p>
			{/if}

			<footer class={cn('flex shrink-0 flex-wrap items-center justify-between gap-2 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]', composeBorderT)}>
				<div class="flex flex-wrap items-center gap-3">
					<Button variant="ghost" type="button" onclick={openFilePicker}>
						<Paperclip class="size-4" aria-hidden="true" />
						<span class={settings.iconOnlyComposeAttach ? 'sr-only' : ''}>Attach</span>
					</Button>
					{#if !settings.hideComposeHints && !settings.signature.trim() && mode === 'new'}
						<a href="/settings/account" class="text-xs text-fg-subtle hover:text-accent hover:underline">
							Add a signature
						</a>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					{#if !settings.hideComposeHints}
						<span id="compose-send-hint" class="hidden max-w-48 text-right text-xs text-fg-subtle sm:inline">
							{sendBlockedReason ?? 'Ctrl+Enter to send'}
						</span>
					{/if}
					{#if settings.iconOnlyComposeDiscard}
						<IconButton label="Discard compose" onclick={close}>
							<X class="size-4" />
						</IconButton>
					{:else}
						<Button variant="ghost" type="button" onclick={close}>Discard</Button>
					{/if}
					<Button
						type="submit"
						disabled={!compose.canSend || invalidRecipients.length > 0}
						title={sendBlockedReason ?? 'Send message'}
						ariaDescribedby={!settings.hideComposeHints ? 'compose-send-hint' : undefined}
					>
						{compose.isSending ? 'Sending…' : compose.hasUploadingAttachments ? 'Uploading…' : 'Send'}
					</Button>
				</div>
			</footer>
		</form>
	</div>
{/snippet}

{#if showPaneShell}
	<div class="z-mail-reader-pane">
		{@render composePanel('pane')}
	</div>
{:else}
	<div class="fixed inset-0 z-40 flex justify-end bg-black/20 backdrop-blur-[1px]">
		{@render composePanel('drawer')}
	</div>
{/if}
