<script lang="ts">
	import type { Snippet } from 'svelte';
	import ZaurMark from './ZaurMark.svelte';
	import SectionTabs from './SectionTabs.svelte';
	import AccountMenu from './AccountMenu.svelte';

	/**
	 * The shell's 52px header. The mark on the left and the tabs and account
	 * tile on the right are fixed; `bar` is the section's own stretch between
	 * them, and however wide it gets it cannot shove the ends somewhere else.
	 */
	let { bar, class: className = '' }: { bar?: Snippet; class?: string } = $props();
</script>

<header
	class="flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--z-line)] bg-[var(--z-surface)] px-4 select-none max-md:gap-2 max-md:px-2.5 {className}"
>
	<ZaurMark />
	<div class="h-4 w-px shrink-0 bg-[var(--z-hairline)] max-md:hidden"></div>

	<div class="flex min-w-0 flex-1 items-center gap-3 max-md:gap-2">
		{@render bar?.()}
	</div>

	<div class="flex shrink-0 items-center gap-2.5">
		<SectionTabs class="hidden sm:flex" />
		<AccountMenu />
	</div>
</header>
