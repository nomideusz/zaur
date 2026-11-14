<script lang="ts">
	// A ranked list: the words and the count, with a hairline measuring it against the
	// longest. The first row is the answer, so it is the one set larger, and the counts
	// after it step back so the eye runs down the words.
	import type { Snippet } from 'svelte';
	import { nf } from '#lib/format';

	let {
		title,
		rows,
		total = 0,
		shares = false,
		name,
		href,
		detail,
		detailHead,
		note,
		empty = 'Nothing yet.',
		limit = Infinity,
		fill = 0,
		flow = 1
	}: {
		title: string;
		rows: [string, number][];
		/** What a share is of, shown on hover. */
		total?: number;
		/** Shows the share as a column as well, where shares are the point. */
		shares?: boolean;
		name?: Snippet<[string]>;
		/** Where a row leads, when its words are a link. */
		href?: (key: string) => string;
		detail?: Snippet<[string]>;
		detailHead?: string;
		note?: string;
		empty?: string;
		limit?: number;
		/** Ruled rows to stand in for missing ones, so lists side by side end level. */
		fill?: number;
		/** Columns the rows run through. */
		flow?: number;
	} = $props();
	const peak = $derived(Math.max(1, ...rows.map((r) => r[1])));
	const shown = $derived(rows.slice(0, limit));
	const spare = $derived(Math.max(0, fill - Math.max(shown.length, 1)));
	const share = (n: number) => Math.round((100 * n) / total);
</script>

{#snippet words(k: string)}{#if name}{@render name(k)}{:else}{k}{/if}{/snippet}

<section style:--flow={flow} class:has-detail={!!detail} class:has-share={shares}>
	<div class="heads">
		{#each { length: flow }, c (c)}
			<div class="head row-grid" class:extra={c > 0}>
				{#if c === 0}<h3>{title}{#if note}{' '}<span>· {note}</span>{/if}</h3>{/if}
				{#if detail}<span class="detail-head">{detailHead}</span>{/if}
			</div>
		{/each}
	</div>
	<div class="rows">
		{#each shown as [k, n], i (k)}
			<div class="row row-grid" class:lead={i === 0 && flow === 1}>
				<span class="words" title={k}>{#if href}<a href={href(k)}>{@render words(k)}</a>{:else}{@render words(k)}{/if}</span>
				{#if detail}<span class="detail count">{@render detail(k)}</span>{/if}
				<span class="n count" title={total && !shares ? `${share(n)}%` : undefined}>{nf.format(n)}</span>
				{#if shares}<small class="count">{share(n)}%</small>{/if}
				<span class="bar"><i style:width="{(100 * n) / peak}%"></i></span>
			</div>
		{:else}
			<p>{empty}</p>
		{/each}
		{#each { length: spare }, i (i)}
			<div class="row spare" aria-hidden="true"><span class="bar"></span></div>
		{/each}
	</div>
</section>

<style>
	section {
		min-width: 0;
	}
	.row-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: 12px;
		align-items: baseline;
	}
	.has-detail .row-grid {
		grid-template-columns: minmax(0, 1fr) 62px 56px;
	}
	.has-share .row-grid {
		grid-template-columns: minmax(0, 1fr) 56px 32px;
	}
	.head {
		padding-bottom: 5px;
		font-size: 12px;
		color: var(--soft);
		border-bottom: 1px solid var(--rule-strong);
	}
	h3 {
		margin: 0;
		font: inherit;
		color: var(--soft);
		grid-column: 1;
	}
	.detail-head {
		grid-column: 2;
		text-align: right;
	}
	/* Rows fill across, so a short list stays level and each column has its own head. */
	.heads,
	.rows {
		display: grid;
		grid-template-columns: repeat(var(--flow), minmax(0, 1fr));
		column-gap: 40px;
	}
	.row {
		padding-top: 5px;
	}
	.words {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		grid-column: 1;
	}
	.n,
	.detail {
		font-size: 12px;
		text-align: right;
		white-space: nowrap;
	}
	.n {
		color: var(--soft);
	}
	.detail,
	small {
		font-size: 11px;
		color: var(--soft);
	}
	small {
		text-align: right;
	}
	/* The answer, a step up from everything else in the list. */
	.lead .words {
		font-size: 15px;
		font-weight: 500;
	}
	.lead .n {
		font-size: 15px;
		color: var(--ink);
	}
	.bar {
		grid-column: 1 / -1;
		display: block;
		height: 1px;
		margin-top: 5px;
		background: var(--rule);
	}
	.bar i {
		display: block;
		height: 1px;
		background: var(--quiet-line);
	}
	.spare {
		/* One text line, to match the rows beside it. */
		padding-top: 22.5px;
	}
	p {
		margin: 8px 0 0;
		color: var(--soft);
	}
	/* Lists stack on a phone, so there is nothing to end level with. */
	@media (max-width: 720px) {
		.heads,
		.rows {
			grid-template-columns: minmax(0, 1fr);
		}
		.extra,
		.spare {
			display: none;
		}
	}
</style>
