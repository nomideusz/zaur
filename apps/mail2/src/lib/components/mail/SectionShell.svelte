<script lang="ts">
	import type { Snippet } from 'svelte';
	import ZaurMark from './ZaurMark.svelte';
	import SectionTabs from './SectionTabs.svelte';

	/**
	 * The frame a sibling section (Contacts, Calendar, Settings) sits in: the
	 * same edge-to-edge shell as mail, the same 52px header — whose mark is the
	 * way back to Mail — the section tabs, and a slot in the header for the
	 * section's own controls. Pages fill the rest.
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
			<h1 class="text-[13px] font-semibold text-[var(--z-body)]">{title}</h1>

			<div class="ml-auto flex min-w-0 items-center gap-2.5">
				{@render controls?.()}
				<SectionTabs class="hidden sm:flex" />
			</div>
		</header>

		{@render children()}
	</div>
</div>
