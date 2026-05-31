<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import MailKeyboardShortcuts from '$lib/components/mail/MailKeyboardShortcuts.svelte';
	import { parseMailContext } from '$lib/mail/routes';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { readerFocus } from '$lib/stores/reader-focus.svelte';
	import { MAIL_LAYOUT } from '$lib/mail/config';

	let { children } = $props();

	$effect(() => {
		const ctx = parseMailContext($page.url.pathname);
		readerFocus.set(false);
		readerFocus.setClean(false);
		mail.clearSelection();
		// Only clear an open thread on list/compose routes — not when entering a thread page.
		if (!ctx?.threadId) {
			mail.cancelOpenMessage();
		}
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

<div class="relative flex min-h-0 flex-1 flex-row overflow-visible {MAIL_LAYOUT.mailRootClass}">
	{@render children()}
</div>
