<script lang="ts">
	// A ranked list: the words, a thin bar against the longest, the count and its share.
	import type { Snippet } from 'svelte';
	import { nf } from '#lib/format';

	let {
		title,
		rows,
		total = 0,
		name,
		note
	}: { title: string; rows: [string, number][]; total?: number; name?: Snippet<[string]>; note?: string } = $props();
	const peak = $derived(Math.max(1, ...rows.map((r) => r[1])));
</script>

<section>
	<h2>{title}{#if note}{' '}<span>· {note}</span>{/if}</h2>
	{#each rows as [k, n] (k)}
		<div class="row">
			<span class="words" title={k}>{#if name}{@render name(k)}{:else}{k}{/if}</span>
			<span class="bar"><i style:width="{(100 * n) / peak}%"></i></span>
			<span class="n">{nf.format(n)}{#if total}{' '}<small>{Math.round((100 * n) / total)}%</small>{/if}</span>
		</div>
	{:else}
		<p>Nothing yet.</p>
	{/each}
</section>

<style>
	h2 {
		margin: 0 0 8px;
		font-size: 12px;
		font-weight: 600;
		color: var(--z-muted);
	}
	h2 span {
		font-weight: 400;
		color: var(--z-soft);
	}
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(40px, 1fr) 84px;
		align-items: center;
		gap: 8px;
		padding: 2px 0;
		font-size: 13px;
		color: var(--z-body);
	}
	.words {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.bar {
		height: 6px;
		background: var(--z-sunken);
		border-radius: 3px;
	}
	.bar i {
		display: block;
		height: 100%;
		background: var(--z-accent);
		border-radius: 3px;
	}
	.n {
		font-family: var(--font-mono);
		font-size: 12px;
		text-align: right;
		white-space: nowrap;
	}
	small {
		font-size: 11px;
		color: var(--z-soft);
	}
	p {
		margin: 0;
		font-size: 13px;
		color: var(--z-soft);
	}
</style>
