<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getShell, useShellBar } from '#lib/shell.svelte.ts';

	/**
	 * A sibling section (Contacts, Calendar, Settings): its title and its own
	 * controls go into the shell's header, and the page fills the rest of the
	 * app column. The header itself is the `(app)` layout's.
	 */
	let {
		title,
		controls,
		children
	}: { title: string; controls?: Snippet; children: Snippet } = $props();

	useShellBar(getShell()!, bar);
</script>

{#snippet bar()}
	<!--
		A phone header has to hold the section's controls, the tabs' stand-in
		and the account tile; mail's carries no title either, and the screen
		says what it is. Kept for screen readers, which have no width limit.
	-->
	<h1 class="text-[13px] font-semibold text-[var(--z-body)] max-sm:sr-only">{title}</h1>

	<div class="ml-auto flex min-w-0 items-center gap-2.5">
		{@render controls?.()}
	</div>
{/snippet}

{@render children()}
