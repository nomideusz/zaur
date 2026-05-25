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
	import { settings } from '$lib/stores/settings.svelte';

	const senderName = $derived(settings.resolvedDisplayName(auth.displayName ?? auth.username));
	const senderEmail = $derived(auth.username ?? '');

	interface Props {
		mode?: ComposeMode;
		initialTo?: string;
	}

	let { mode = 'new', initialTo = '' }: Props = $props();
	let fileInput = $state<HTMLInputElement | null>(null);
	let bodyInput = $state<HTMLTextAreaElement | null>(null);
	let toInput = $state<HTMLInputElement | null>(null);

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

	const title = $derived(titles[mode] ?? 'New message');

	const draftStatus = $derived.by(() => {
		if (compose.isSavingDraft) return 'Saving draft…';
		if (compose.draftSavedAt) return 'Draft saved';
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
		function onKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') close();
		}
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	async function send() {
		if (!auth.client || !auth.username) return;
		const result = await compose.send(auth.client, auth.username, senderName);
		if (result === 'sent') goto('/mail/sent');
		else if (result === 'queued') goto('/mail/inbox');
	}

	function close() {
		const hasContent =
			compose.to.trim() ||
			compose.cc.trim() ||
			compose.bcc.trim() ||
			compose.subject.trim() ||
			compose.body.trim() ||
			compose.attachments.length;

		if (hasContent && !confirm('Discard this message?')) return;

		compose.reset();
		goto('/mail/inbox');
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

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-40 flex justify-end bg-black/20 backdrop-blur-[1px]" onclick={close}>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="z-panel flex h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden border-l shadow-md"
		onclick={(e) => e.stopPropagation()}
	>
		<header class="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
			<div>
				<h2 class="text-base font-semibold text-fg">{title}</h2>
				{#if draftStatus}
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
			<div class="shrink-0 space-y-0 border-b border-border bg-surface/50">
				<div class="flex items-center gap-3 border-b border-border px-5 py-2.5 text-sm">
					<span class="w-14 shrink-0 text-fg-subtle">From</span>
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

				<div class="flex items-center gap-3 border-b border-border px-5 py-2.5 text-sm">
					<span class="w-14 shrink-0 text-fg-subtle">To</span>
					<ComposeRecipientInput
						bind:inputElement={toInput}
						value={compose.to}
						placeholder="recipient@example.com"
						autocomplete="email"
						oninput={(value) => (compose.to = value)}
					/>
					{#if !compose.showCcBcc}
						<button
							type="button"
							class="shrink-0 text-xs text-accent hover:underline"
							onclick={() => (compose.showCcBcc = true)}
						>
							Cc/Bcc
						</button>
					{/if}
				</div>

				{#if compose.showCcBcc}
					<div class="flex items-center gap-3 border-b border-border px-5 py-2.5 text-sm">
						<span class="w-14 shrink-0 text-fg-subtle">Cc</span>
						<ComposeRecipientInput
							value={compose.cc}
							placeholder="cc@example.com"
							autocomplete="email"
							oninput={(value) => (compose.cc = value)}
						/>
					</div>
					<label class="flex items-center gap-3 border-b border-border px-5 py-2.5 text-sm">
						<span class="w-14 shrink-0 text-fg-subtle">Bcc</span>
						<ComposeRecipientInput
							value={compose.bcc}
							placeholder="bcc@example.com"
							autocomplete="email"
							oninput={(value) => (compose.bcc = value)}
						/>
					</label>
				{/if}

				<label class="flex items-center gap-3 px-5 py-2.5 text-sm">
					<span class="w-14 shrink-0 text-fg-subtle">Subject</span>
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
					class="min-h-0 flex-1 resize-none bg-transparent px-5 py-4 leading-relaxed outline-none placeholder:text-fg-subtle"
					style="font-size: var(--z-reader-text)"
					placeholder="Write your message…"
					value={editableBody}
					oninput={(e) => setEditableBody(e.currentTarget.value)}
					onkeydown={onKeydown}
				></textarea>

				{#if quotedPart}
					<details class="shrink-0 border-t border-border bg-surface/50 px-5 py-2" open>
						<summary class="cursor-pointer text-xs font-medium text-fg-muted">Quoted message</summary>
						<pre class="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-fg-subtle">{quotedPart.trim()}</pre>
					</details>
				{/if}
			</div>

			<ComposeAttachments />

			{#if compose.error}
				<p class="border-t border-border px-5 py-2 text-sm text-danger" role="alert">{compose.error}</p>
			{/if}

			<footer class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
				<div class="flex flex-wrap items-center gap-3">
					<Button variant="ghost" type="button" onclick={openFilePicker}>
						<Paperclip class="size-4" aria-hidden="true" />
						Attach
					</Button>
					{#if !settings.hideComposeHints && !settings.signature.trim() && mode === 'new'}
						<a href="/settings/account" class="text-xs text-fg-subtle hover:text-accent hover:underline">
							Add a signature
						</a>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					{#if !settings.hideComposeHints}
						<span class="hidden text-xs text-fg-subtle sm:inline">Ctrl+Enter to send</span>
					{/if}
					<Button variant="ghost" type="button" onclick={close}>Discard</Button>
					<Button type="submit" disabled={!compose.canSend}>
						{compose.isSending ? 'Sending…' : compose.hasUploadingAttachments ? 'Uploading…' : 'Send'}
					</Button>
				</div>
			</footer>
		</form>
	</div>
</div>
