<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { isTypingTarget } from '$lib/utils/keyboard';
	import MailKeyboardShortcuts from '$lib/components/mail/MailKeyboardShortcuts.svelte';
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import { parseMailContext } from '$lib/mail/routes';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { MAIL_LAYOUT } from '$lib/mail/config';

	let { children } = $props();

	$effect(() => {
		const ctx = parseMailContext($page.url.pathname);
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

			if (isTypingTarget(event.target)) return;

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

<div class="relative flex min-h-0 flex-1 flex-row overflow-hidden {MAIL_LAYOUT.mailRootClass}">
	<div class="hidden md:contents">
		<MailboxSidebar class="hidden md:flex" />
	</div>
	{@render children()}
</div>
