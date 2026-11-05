<script lang="ts">
	// Where a site's arrivals came from, as coded blocks in a fixed order. The legend
	// decodes them, each block names itself, and a screen reader gets the words.
	import { groupRows } from '#lib/sources';

	let { rows }: { rows: [string, number][] } = $props();
	const groups = $derived(groupRows(rows));
	const total = $derived(groups.reduce((a, g) => a + g.n, 0));
	const share = (n: number) => Math.round((100 * n) / total);
</script>

<span class="strip" class:empty={!total}>
	{#each groups as g (g.id)}
		<i style:flex-grow={g.n} style:background="var(--src-{g.id})" title="{g.label} {share(g.n)}%"></i>
	{/each}
</span>
<span class="sr">{#if total}Came from: {groups.map((g) => `${g.label} ${share(g.n)}%`).join(', ')}{:else}No arrivals from outside{/if}</span>

<style>
	.strip {
		display: flex;
		gap: 2px;
		width: 96px;
		height: 10px;
	}
	.strip i {
		display: block;
		flex: 1 1 0;
		min-width: 2px;
	}
	.empty {
		border: 1px solid var(--rule-strong);
	}
</style>
