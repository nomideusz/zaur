<script lang="ts">
	import { goto } from '$app/navigation';
	import { X } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
</script>

<div class="fixed inset-0 z-40 flex justify-end bg-black/20 backdrop-blur-[1px]">
	<div class="z-panel flex h-full w-full max-w-2xl flex-col border-l shadow-md">
		<header class="flex items-center justify-between border-b border-border px-4 py-3">
			<h2 class="text-sm font-semibold text-fg">New message</h2>
			<IconButton label="Close compose" onclick={() => goto('/mail/inbox')}>
				<X class="size-4" />
			</IconButton>
		</header>

		<form class="flex flex-1 flex-col overflow-hidden" onsubmit={(e) => e.preventDefault()}>
			<div class="space-y-0 border-b border-border">
				<label class="flex items-center gap-3 border-b border-border px-4 py-2.5 text-sm">
					<span class="w-12 shrink-0 text-fg-subtle">To</span>
					<input type="email" class="flex-1 bg-transparent outline-none" placeholder="recipient@example.com" />
				</label>
				<label class="flex items-center gap-3 px-4 py-2.5 text-sm">
					<span class="w-12 shrink-0 text-fg-subtle">Subject</span>
					<input type="text" class="flex-1 bg-transparent outline-none" placeholder="Subject" />
				</label>
			</div>

			<textarea
				class="min-h-0 flex-1 resize-none bg-transparent px-4 py-4 text-sm leading-relaxed outline-none"
				placeholder="Write your message…"
			></textarea>

			<footer class="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
				<Button variant="ghost" href="/mail/inbox">Discard</Button>
				<Button type="submit">Send</Button>
			</footer>
		</form>
	</div>
</div>
