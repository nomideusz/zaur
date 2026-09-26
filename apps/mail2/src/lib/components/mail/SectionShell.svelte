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
		A narrow phone header gives the width to the section's controls, and the
		tab row says where you are; kept for screen readers, which have no width
		limit. With no controls the title has the bar to itself.
	-->
	<h1 class="text-[13px] font-semibold text-[var(--z-body)] {controls ? 'max-sm:sr-only' : 'max-md:pl-1.5 max-md:text-[15px]'}">{title}</h1>

	<div class="ml-auto flex min-w-0 items-center gap-2.5">
		{@render controls?.()}
	</div>
{/snippet}

{@render children()}
