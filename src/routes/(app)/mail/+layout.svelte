<script lang="ts">
	import { page } from '$app/stores';
	import { PenSquare } from 'lucide-svelte';

	let { children } = $props();

	const showComposeFab = $derived.by(() => {
		const path = $page.url.pathname;
		if (!path.startsWith('/mail') || path.startsWith('/mail/compose')) return false;
		// Hide on thread view — quick reply bar lives at the bottom on mobile
		if (/^\/mail\/[^/]+\/[^/]+\/?$/.test(path)) return false;
		return true;
	});
</script>

<div class="relative flex min-h-0 flex-1 overflow-hidden">
	{@render children()}

	{#if showComposeFab}
		<a
			href="/mail/compose"
			class="fixed bottom-6 right-6 z-50 inline-flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-md transition-transform hover:bg-accent-hover active:scale-95 md:hidden"
			aria-label="Compose new message"
		>
			<PenSquare class="size-6" aria-hidden="true" />
		</a>
	{/if}
</div>
