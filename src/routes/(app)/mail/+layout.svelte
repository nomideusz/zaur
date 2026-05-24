<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { PenSquare } from 'lucide-svelte';

	let { children } = $props();

	const showComposeFab = $derived.by(() => {
		const path = $page.url.pathname;
		if (!path.startsWith('/mail') || path.startsWith('/mail/compose')) return false;
		if (/^\/mail\/[^/]+\/[^/]+\/?$/.test(path)) return false;
		return true;
	});

	onMount(() => {
		function onKeydown(event: KeyboardEvent) {
			if (event.key !== 'c' || event.metaKey || event.ctrlKey || event.altKey) return;

			const target = event.target;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target instanceof HTMLSelectElement ||
				(target instanceof HTMLElement && target.isContentEditable)
			) {
				return;
			}

			if (!$page.url.pathname.startsWith('/mail/compose')) {
				event.preventDefault();
				goto('/mail/compose');
			}
		}

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
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
