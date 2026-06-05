<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import MailKeyboardShortcuts from '$lib/components/mail/MailKeyboardShortcuts.svelte';
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import X from '$lib/components/icons/X.svelte';
	import { parseMailContext } from '$lib/mail/routes';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { readerFocus } from '$lib/stores/reader-focus.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { MAIL_LAYOUT } from '$lib/mail/config';

	let { children } = $props();

	$effect(() => {
		const ctx = parseMailContext($page.url.pathname);
		readerFocus.setClean(false);
		mail.clearSelection();
		// Only clear an open thread on list/compose routes — not when entering a thread page.
		if (!ctx?.threadId) {
			mail.cancelOpenMessage();
		}
	});

	$effect(() => {
		// Close mobile drawer on route change
		$page.url.pathname;
		shellHeader.isMobileDrawerOpen = false;
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

<svelte:window onkeydown={(e) => {
	if (e.key === 'Escape' && shellHeader.isMobileDrawerOpen) {
		shellHeader.isMobileDrawerOpen = false;
	}
}} />

<MailKeyboardShortcuts />

<div class="relative flex min-h-0 flex-1 flex-row overflow-hidden {MAIL_LAYOUT.mailRootClass}">
	<div class="hidden md:contents">
		<MailboxSidebar class="hidden md:flex" />
	</div>
	{@render children()}
</div>

{#if shellHeader.isMobileDrawerOpen}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs md:hidden"
		transition:fade={{ duration: 200 }}
		onclick={() => {
			shellHeader.isMobileDrawerOpen = false;
		}}
	></div>

	<!-- Drawer panel -->
	<div
		class="fixed inset-y-0 left-0 z-50 flex w-(--width-sidebar) max-w-[280px] flex-col bg-surface shadow-2xl md:hidden"
		transition:fly={{ x: -280, duration: 250, easing: (t) => 1 - Math.pow(1 - t, 3) }}
	>
		<div class="flex items-center justify-between border-b border-border/80 px-4 py-3 shrink-0">
			<span class="z-type-label">Mailboxes</span>
			<button
				type="button"
				class="flex size-7 items-center justify-center rounded-md text-fg-muted hover:bg-surface-sunken/80 transition-colors"
				aria-label="Close menu"
				onclick={() => {
					shellHeader.isMobileDrawerOpen = false;
				}}
			>
				<X class="size-4" aria-hidden="true" />
			</button>
		</div>

		<div class="flex-1 min-h-0 overflow-y-auto">
			<MailboxSidebar isMobile={true} class="w-full border-r-0 flex" />
		</div>
	</div>
{/if}
