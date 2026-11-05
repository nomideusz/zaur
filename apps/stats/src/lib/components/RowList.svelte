<script lang="ts">
	// A ranked list: the words, the count and its share, with a hairline measuring it against the longest.
	import type { Snippet } from 'svelte';
	import { nf } from '#lib/format';

	let {
		title,
		rows,
		total = 0,
		name,
		note,
		empty = 'Nothing yet.'
	}: { title: string; rows: [string, number][]; total?: number; name?: Snippet<[string]>; note?: string; empty?: string } = $props();
	const peak = $derived(Math.max(1, ...rows.map((r) => r[1])));
</script>

<section>
	<h2>{title}{#if note}{' '}<span>· {note}</span>{/if}</h2>
	{#each rows as [k, n] (k)}
		<div class="row">
			<span class="words" title={k}>{#if name}{@render name(k)}{:else}{k}{/if}</span>
			<span class="n count">{nf.format(n)}{#if total}<small>{Math.round((100 * n) / total)}%</small>{/if}</span>
			<span class="bar"><i style:width="{(100 * n) / peak}%"></i></span>
		</div>
	{:else}
		<p>{empty}</p>
	{/each}
</section>

<style>
	section {
		min-width: 0;
	}
	h2 {
		margin: 0 0 6px;
		padding-bottom: 6px;
		font-size: 13px;
		font-weight: 600;
		border-bottom: 1px solid var(--rule-strong);
	}
	h2 span {
		font-weight: 400;
		color: var(--soft);
	}
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: 12px;
		align-items: baseline;
		padding-top: 5px;
	}
	.words {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.n {
		font-size: 12px;
		white-space: nowrap;
	}
	small {
		display: inline-block;
		width: 38px;
		font-size: 11px;
		text-align: right;
		color: var(--soft);
	}
	.bar {
		grid-column: 1 / -1;
		height: 1px;
		margin-top: 5px;
		background: var(--rule);
	}
	.bar i {
		display: block;
		height: 1px;
		background: var(--quiet-line);
	}
	p {
		margin: 8px 0 0;
		color: var(--soft);
	}
</style>
