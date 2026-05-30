<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import MailKeyboardShortcuts from '$lib/components/mail/MailKeyboardShortcuts.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { readerFocus } from '$lib/stores/reader-focus.svelte';

	let { children } = $props();

	const isThreadOpen = $derived(!!$page.params.threadId);
	const focusActive = $derived(readerFocus.active && isThreadOpen);
	const adaptiveThreadOpen = $derived(settings.focusLayoutMode === 'adaptive' && isThreadOpen);

	onMount(() => {
		function onKeydown(event: KeyboardEvent) {
			if (!settings.enableKeyboardShortcuts) return;
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

<MailKeyboardShortcuts />

<div
	class="relative flex min-h-0 flex-1 flex-row overflow-hidden"
	class:z-reader-focus={focusActive}
	class:z-layout-adaptive-thread={adaptiveThreadOpen}
>
	{@render children()}
</div>
