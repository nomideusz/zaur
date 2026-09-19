<script lang="ts">
	import type { Snippet } from 'svelte';
	import ZaurMark from './ZaurMark.svelte';
	import SectionTabs from './SectionTabs.svelte';
	import AccountMenu from './AccountMenu.svelte';

	/**
	 * The frame a sibling section (Contacts, Calendar, Settings) sits in: the
	 * same edge-to-edge shell as mail, the same 52px header — whose mark is the
	 * way back to Mail — and a slot in it for the section's own controls.
	 * Pages fill the rest.
	 *
	 * The tabs and the account tile are a fixed cluster on the right, outside
	 * the controls slot: they are the shell, not the section, and a wide set of
	 * controls must not shove them somewhere else. They sit at the same place
	 * here as they do in mail's `TopBar`, which is the point of both.
	 */
	let {
		title,
		controls,
		children
	}: { title: string; controls?: Snippet; children: Snippet } = $props();
</script>

<div class="flex h-svh w-full flex-col items-center justify-center overflow-hidden bg-[var(--z-ground)] text-[var(--z-ink)]">
	<div class="relative flex h-full w-full max-w-[1780px] flex-col overflow-hidden bg-[var(--z-surface)]">
		<header
			class="flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--z-line)] bg-[var(--z-surface)] px-4 select-none max-md:gap-2 max-md:px-2.5"
		>
			<ZaurMark />
			<div class="h-4 w-px bg-[var(--z-hairline)] max-md:hidden"></div>
			<!--
				A phone header has to hold the section's controls, the tabs' stand-in
				and the account tile; mail's carries no title either, and the screen
				says what it is. Kept for screen readers, which have no width limit.
			-->
			<h1 class="text-[13px] font-semibold text-[var(--z-body)] max-sm:sr-only">{title}</h1>

			<div class="ml-auto flex min-w-0 items-center gap-2.5">
				{@render controls?.()}
			</div>
			<div class="flex shrink-0 items-center gap-2.5">
				<SectionTabs class="hidden sm:flex" />
				<AccountMenu />
			</div>
		</header>

		{@render children()}
	</div>
</div>
