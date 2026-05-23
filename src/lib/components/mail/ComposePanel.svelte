<script lang="ts">
	import { goto } from '$app/navigation';
	import { X } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose } from '$lib/stores/compose.svelte';

	interface Props {
		mode?: 'new' | 'reply';
	}

	let { mode = 'new' }: Props = $props();

	const title = $derived(mode === 'reply' ? 'Reply' : 'New message');

	async function send() {
		if (!auth.client || !auth.username) return;
		const ok = await compose.send(auth.client, auth.username, auth.displayName ?? undefined);
		if (ok) goto('/mail/sent');
	}

	function close() {
		compose.reset();
		goto('/mail/inbox');
	}
</script>

<div class="fixed inset-0 z-40 flex justify-end bg-black/20 backdrop-blur-[1px]">
	<div class="z-panel flex h-full w-full max-w-2xl flex-col border-l shadow-md">
		<header class="flex items-center justify-between border-b border-border px-4 py-3">
			<h2 class="text-sm font-semibold text-fg">{title}</h2>
			<IconButton label="Close compose" onclick={close}>
				<X class="size-4" />
			</IconButton>
		</header>

		<form class="flex flex-1 flex-col overflow-hidden" onsubmit={(e) => { e.preventDefault(); void send(); }}>
			<div class="space-y-0 border-b border-border">
				<label class="flex items-center gap-3 border-b border-border px-4 py-2.5 text-sm">
					<span class="w-12 shrink-0 text-fg-subtle">To</span>
					<input
						type="text"
						class="flex-1 bg-transparent outline-none"
						placeholder="recipient@example.com"
						bind:value={compose.to}
						autocomplete="email"
					/>
				</label>
				<label class="flex items-center gap-3 px-4 py-2.5 text-sm">
					<span class="w-12 shrink-0 text-fg-subtle">Subject</span>
					<input
						type="text"
						class="flex-1 bg-transparent outline-none"
						placeholder="Subject"
						bind:value={compose.subject}
					/>
				</label>
			</div>

			<textarea
				class="min-h-0 flex-1 resize-none bg-transparent px-4 py-4 text-sm leading-relaxed outline-none"
				placeholder="Write your message…"
				bind:value={compose.body}
			></textarea>

			{#if compose.error}
				<p class="border-t border-border px-4 py-2 text-sm text-danger">{compose.error}</p>
			{/if}

			<footer class="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
				<Button variant="ghost" type="button" onclick={close}>Discard</Button>
				<Button type="submit" disabled={compose.isSending}>
					{compose.isSending ? 'Sending…' : 'Send'}
				</Button>
			</footer>
		</form>
	</div>
</div>
