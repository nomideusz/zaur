<script lang="ts">
	import { goto } from '$app/navigation';
	import { Paperclip, X } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ComposeAttachments from '$lib/components/mail/ComposeAttachments.svelte';
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
			if (mode === 'new') {
				toInput?.focus();
			} else {
				bodyInput?.focus();
			}
		});
	});

	async function send() {
		if (!auth.client || !auth.username) return;
		const result = await compose.send(auth.client, auth.username, senderName);
		if (result === 'sent') goto('/mail/sent');
		else if (result === 'queued') goto('/mail/inbox');
	}

	function close() {
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

<div class="fixed inset-0 z-40 flex justify-end bg-black/20 backdrop-blur-[1px]">
	<div class="z-panel flex h-full w-full max-w-2xl flex-col border-l shadow-md">
		<header class="flex items-center justify-between border-b border-border px-5 py-3.5">
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
			class="flex flex-1 flex-col overflow-hidden"
			onsubmit={(e) => {
				e.preventDefault();
				void send();
			}}
		>
			<div class="space-y-0 border-b border-border bg-surface/50">
				<div class="flex items-center gap-3 border-b border-border px-5 py-2.5 text-sm">
					<span class="w-14 shrink-0 text-fg-subtle">From</span>
					<p class="min-w-0 truncate text-fg">
						{senderName}
						{#if senderEmail}
							<span class="text-fg-muted">&lt;{senderEmail}&gt;</span>
						{/if}
					</p>
				</div>

				<label class="flex items-center gap-3 border-b border-border px-5 py-2.5 text-sm">
					<span class="w-14 shrink-0 text-fg-subtle">To</span>
					<input
						bind:this={toInput}
						type="text"
						class="flex-1 bg-transparent outline-none placeholder:text-fg-subtle"
						placeholder="recipient@example.com"
						bind:value={compose.to}
						autocomplete="email"
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
				</label>

				{#if compose.showCcBcc}
					<label class="flex items-center gap-3 border-b border-border px-5 py-2.5 text-sm">
						<span class="w-14 shrink-0 text-fg-subtle">Cc</span>
						<input
							type="text"
							class="flex-1 bg-transparent outline-none placeholder:text-fg-subtle"
							placeholder="cc@example.com"
							bind:value={compose.cc}
							autocomplete="email"
						/>
					</label>
					<label class="flex items-center gap-3 border-b border-border px-5 py-2.5 text-sm">
						<span class="w-14 shrink-0 text-fg-subtle">Bcc</span>
						<input
							type="text"
							class="flex-1 bg-transparent outline-none placeholder:text-fg-subtle"
							placeholder="bcc@example.com"
							bind:value={compose.bcc}
							autocomplete="email"
						/>
					</label>
				{/if}

				<label class="flex items-center gap-3 px-5 py-2.5 text-sm">
					<span class="w-14 shrink-0 text-fg-subtle">Subject</span>
					<input
						type="text"
						class="flex-1 bg-transparent outline-none placeholder:text-fg-subtle"
						placeholder="Subject"
						bind:value={compose.subject}
					/>
				</label>
			</div>

			<textarea
				bind:this={bodyInput}
				class="min-h-0 flex-1 resize-none bg-transparent px-5 py-4 text-sm leading-relaxed outline-none placeholder:text-fg-subtle"
				placeholder="Write your message…"
				bind:value={compose.body}
				onkeydown={onKeydown}
			></textarea>

			<ComposeAttachments />

			{#if compose.error}
				<p class="border-t border-border px-5 py-2 text-sm text-danger">{compose.error}</p>
			{/if}

			<footer class="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
				<Button variant="ghost" type="button" onclick={openFilePicker}>
					<Paperclip class="size-4" aria-hidden="true" />
					Attach
				</Button>
				<div class="flex items-center gap-2">
					<span class="hidden text-xs text-fg-subtle sm:inline">Ctrl+Enter to send</span>
					<Button variant="ghost" type="button" onclick={close}>Discard</Button>
					<Button type="submit" disabled={!compose.canSend}>
						{compose.isSending ? 'Sending…' : compose.hasUploadingAttachments ? 'Uploading…' : 'Send'}
					</Button>
				</div>
			</footer>
		</form>
	</div>
</div>
