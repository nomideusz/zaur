<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Splitter } from '@ark-ui/svelte/splitter';
	import { onMount } from 'svelte';
	import { isTypingTarget } from '$lib/utils/keyboard';
	import MailKeyboardShortcuts from '$lib/components/mail/MailKeyboardShortcuts.svelte';
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import { parseMailContext } from '$lib/mail/routes';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { MAIL_LAYOUT } from '$lib/mail/config';

	let { children } = $props();

	/* Resizable folder sidebar (desktop) — Ark Splitter, size persisted locally. */
	const SPLIT_KEY = 'zaur:mail-split';
	const DEFAULT_SPLIT = [18, 82];
	function loadSplit(): number[] {
		try {
			const stored = JSON.parse(localStorage.getItem(SPLIT_KEY) ?? '');
			if (
				Array.isArray(stored) &&
				stored.length === 2 &&
				stored.every((n) => typeof n === 'number' && n > 0)
			) {
				return stored;
			}
		} catch {
			/* fall through to default */
		}
		return DEFAULT_SPLIT;
	}
	function saveSplit(size: number[]) {
		try {
			localStorage.setItem(SPLIT_KEY, JSON.stringify(size));
		} catch {
			/* private mode — resize just won't persist */
		}
	}

	let splitSize = $state(loadSplit());

	function resetSplit() {
		splitSize = [...DEFAULT_SPLIT];
		saveSplit(DEFAULT_SPLIT);
	}

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
	<Splitter.Root
		panels={[
			{ id: 'nav', minSize: '13rem', maxSize: '26rem' },
			{ id: 'main', minSize: '50%' }
		]}
		bind:size={splitSize}
		onResizeEnd={(details) => saveSplit(details.size)}
		class="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden"
	>
		<!-- Panel drives the sidebar's width var so the sidebar fills it. -->
		<Splitter.Panel
			id="nav"
			class="max-md:hidden! flex min-h-0"
			style="--width-sidebar: 100%"
		>
			<MailboxSidebar class="hidden md:flex" />
		</Splitter.Panel>
		<Splitter.ResizeTrigger
			id="nav:main"
			aria-label="Resize folder sidebar (double-click to reset)"
			title="Drag to resize · double-click to reset"
			class="z-mail-split-trigger max-md:hidden!"
			ondblclick={resetSplit}
		/>
		<Splitter.Panel id="main" class="flex min-h-0 min-w-0 flex-row overflow-hidden">
			{@render children()}
		</Splitter.Panel>
	</Splitter.Root>
</div>
