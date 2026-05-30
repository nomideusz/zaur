<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import MailKeyboardShortcuts from '$lib/components/mail/MailKeyboardShortcuts.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { readerFocus } from '$lib/stores/reader-focus.svelte';
	import { setWebmailModeContext } from '$lib/modes/context';
	import { webmailModeDefinition } from '$lib/modes/registry';

	let { children } = $props();

	const isThreadOpen = $derived(!!$page.params.threadId);
	const activeMode = $derived(webmailModeDefinition(settings.mailViewMode));

	setWebmailModeContext(() => webmailModeDefinition(settings.mailViewMode));
	const focusActive = $derived(
		activeMode.mail.useAdaptiveReaderFocus && readerFocus.active && isThreadOpen
	);
	const adaptiveThreadOpen = $derived(activeMode.mail.useAdaptiveReaderFocus && isThreadOpen);

	$effect(() => {
		activeMode.id;
		readerFocus.set(false);
		readerFocus.setClean(false);
		mail.clearSelection();
	});

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

{#key activeMode.id}
	<div
		class="relative flex flex-1 flex-row {activeMode.id === 'simple'
			? 'min-h-0 overflow-visible'
			: 'min-h-0 overflow-hidden'} {activeMode.mailRootClass}"
		class:z-reader-focus={focusActive}
		class:z-layout-adaptive-thread={adaptiveThreadOpen}
	>
		{@render children()}
	</div>
{/key}
