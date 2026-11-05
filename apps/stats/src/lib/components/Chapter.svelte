<script lang="ts">
	// One question a report answers, with the lists that answer it side by side. Every
	// list shows the same number of rows, so the rows run level across the chapter.
	import type { Snippet } from 'svelte';

	const CAP = 6;
	let { title, lengths, flow = 1, children }: { title: string; lengths: number[]; flow?: number; children: Snippet<[number, number]> } = $props();

	let open = $state(false);
	const most = $derived(Math.max(0, ...lengths));
	const cap = $derived(CAP * flow);
	const limit = $derived(open ? Infinity : cap);
	const fill = $derived(flow > 1 ? 0 : Math.min(most, limit));
</script>

<section class="chapter">
	<header>
		<h2>{title}</h2>
		{#if most > cap}
			<button type="button" aria-expanded={open} onclick={() => (open = !open)}>{open ? 'Show fewer' : `Show all ${most}`}</button>
		{/if}
	</header>
	<div class="lists" style:--n={lengths.length}>
		{@render children(limit, fill)}
	</div>
</section>

<style>
	.chapter + :global(.chapter) {
		margin-top: 32px;
	}
	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 10px;
	}
	h2 {
		margin: 0;
		font-size: 15px;
		font-weight: 500;
	}
	button {
		padding: 0;
		font: inherit;
		font-size: 12px;
		color: var(--soft);
		background: none;
		border: 0;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-thickness: 1px;
	}
	button:hover {
		color: var(--ink);
		text-decoration-thickness: 2px;
	}
	.lists {
		display: grid;
		grid-template-columns: repeat(var(--n), minmax(0, 1fr));
		gap: 24px 40px;
	}
	@media (max-width: 1040px) {
		.lists {
			grid-template-columns: repeat(min(var(--n), 2), minmax(0, 1fr));
			gap: 24px 28px;
		}
	}
	@media (max-width: 720px) {
		.lists {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
