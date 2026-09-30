<script lang="ts">
	import type { Snippet } from 'svelte';
	import { online } from 'svelte/reactivity/window';
	import { updated } from '$app/state';
	import ZaurMark from './ZaurMark.svelte';
	import SectionTabs from './SectionTabs.svelte';
	import AccountMenu from './AccountMenu.svelte';
	import { compose } from '#lib/compose/store.svelte.ts';
	import { CHANNELS, channelStyle } from '#lib/mail/colors';

	/**
	 * The shell's 52px header. The mark on the left and the tabs and account
	 * tile on the right are fixed; `bar` is the section's own stretch between
	 * them, and however wide it gets it cannot shove the ends somewhere else —
	 * nor draw over them: what does not fit is clipped at the stretch's own
	 * edge, so a control is either whole and clickable or not there, never
	 * under a tab. (Clipped sideways only; the inset keeps a focus ring at
	 * either end whole.)
	 * A phone keeps only the stretch: the tab row along the bottom is home, the
	 * sections and (in Settings) the account.
	 *
	 * Next to the tabs, the three things the whole app should say once: that the
	 * connection is gone, that messages are waiting in the outbox (which has no
	 * folder to look in, and sends from every section), and that a newer version
	 * is waiting for a reload. A phone's header has no room to spare, so there
	 * they get a strip of their own along the top of the screen (above this
	 * header, and above Mail's own phone bar, which replaces it): in the flow, so
	 * it covers nothing, and the page is that much shorter while it shows.
	 */
	let { bar, class: className = '' }: { bar?: Snippet; class?: string } = $props();

	const waiting = $derived(compose.outboxCount);
</script>

{#if online.current === false}
	<p class="z-caption shrink-0 border-b border-[var(--z-line)] bg-[var(--z-sunken)] text-center !leading-7 text-[var(--z-muted)] md:hidden" role="status">
		Offline{#if waiting > 0}&nbsp;· {waiting} waiting to send{/if}
	</p>
{:else if waiting > 0}
	<!-- On the header's own surface: the system bar above is painted from the top edge, and keeps its colour. -->
	<p class="shrink-0 border-b border-[var(--z-line)] bg-[var(--z-surface)] text-center text-[12.5px] leading-7 font-semibold text-[var(--z-ch-needs-ink)] md:hidden" role="status">
		{waiting} waiting to send
	</p>
{:else if updated.current}
	<button
		type="button"
		class="h-10 shrink-0 border-b border-[var(--z-line)] bg-[var(--z-sunken)] text-[13px] font-semibold text-[var(--z-accent-ink)] md:hidden"
		onclick={() => location.reload()}
	>
		A new version is ready · Reload
	</button>
{/if}

<header
	class="z-shell-header flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--z-line)] bg-[var(--z-surface)] px-4 select-none max-lg:gap-2 max-md:px-2.5 {className}"
>
	<ZaurMark class="max-md:hidden" />
	<div class="h-4 w-px shrink-0 bg-[var(--z-hairline)] max-md:hidden"></div>

	<div class="@container -mx-1 flex min-w-0 flex-1 items-center gap-3 overflow-x-clip px-1 max-lg:gap-2">
		{@render bar?.()}
	</div>

	<div class="flex shrink-0 items-center gap-2.5 max-md:hidden">
		{#if waiting > 0}
			<!-- Beside a tablet's tabs only the number has room; the words are its title.
			     (A chip is a block of text, not a flex row: the space and the inline
			     glyph are what keep the number apart from what follows it.) -->
			<span class="z-chip z-chip-filled" style={channelStyle(CHANNELS.needs)} role="status" aria-label="{waiting} waiting to send" title="{waiting} waiting to send:{waiting === 1 ? 'it goes' : 'they go'} out when the server can be reached">
				{waiting}&nbsp;<span class="max-lg:sr-only">waiting to send</span><svg class="inline size-2.5 lg:hidden" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M8 13V3.5M4 7l4-4 4 4" />
				</svg>
			</span>
		{/if}
		{#if online.current === false}
			<!-- Beside a tablet's tabs the word costs a section its search field or its date: a glyph there. -->
			<span class="z-chip max-lg:hidden" role="status">Offline</span>
			<span class="grid size-6 shrink-0 place-items-center text-[var(--z-muted)] lg:hidden" role="status" aria-label="Offline" title="Offline">
				<svg class="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true">
					<path d="M2 6.6a8.6 8.6 0 0 1 12 0M4.6 9.2a4.9 4.9 0 0 1 6.8 0M2.5 2.5l11 11" />
					<circle cx="8" cy="12" r="0.7" fill="currentColor" stroke="none" />
				</svg>
			</span>
		{:else if updated.current}
			<button
				type="button"
				class="btn-tactile !h-[26px] !px-2 !text-[12px]"
				title="A new version of Zaur Mail is ready"
				aria-label="Reload to update"
				onclick={() => location.reload()}
			>
				<!-- Beside a tablet's tabs the whole sentence cut a section's date or search field short. -->
				Reload<span class="max-lg:hidden">&nbsp;to update</span>
			</button>
		{/if}
		<SectionTabs />
		<AccountMenu />
	</div>
</header>
