<script lang="ts">
	import type { Snippet } from 'svelte';
	import { online } from 'svelte/reactivity/window';
	import { updated } from '$app/state';
	import ZaurMark from './ZaurMark.svelte';
	import SectionTabs from './SectionTabs.svelte';
	import AccountMenu from './AccountMenu.svelte';

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
	 * Next to the tabs, the two things the whole app should say once: that the
	 * connection is gone, and that a newer version is waiting for a reload. A
	 * phone's header has no room to spare, so there the same two get a strip of
	 * their own along the top of the screen (above this header, and above Mail's
	 * own phone bar, which replaces it): in the flow, so it covers nothing, and
	 * the page is that much shorter while it shows.
	 */
	let { bar, class: className = '' }: { bar?: Snippet; class?: string } = $props();
</script>

{#if online.current === false}
	<p class="z-caption shrink-0 border-b border-[var(--z-line)] bg-[var(--z-sunken)] text-center !leading-7 text-[var(--z-muted)] md:hidden" role="status">
		Offline
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
		{#if online.current === false}
			<span class="z-chip" role="status">Offline</span>
		{:else if updated.current}
			<button
				type="button"
				class="btn-tactile !h-[26px] !px-2 !text-[12px]"
				title="A new version of Zaur Mail is ready"
				onclick={() => location.reload()}
			>
				Reload to update
			</button>
		{/if}
		<SectionTabs />
		<AccountMenu />
	</div>
</header>
