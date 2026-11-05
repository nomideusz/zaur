<script lang="ts">
	import { resolve } from '$app/paths';
	import { nf, secs, siteName } from '#lib/format';
	import { reloading } from '#lib/reloading.svelte';
	import { SOURCES } from '#lib/sources';
	import Bars from '#lib/components/Bars.svelte';
	import RowList from '#lib/components/RowList.svelte';
	import SubBar from '#lib/components/SubBar.svelte';
	import VisitTable from '#lib/components/VisitTable.svelte';

	let { data } = $props();
	const r = $derived(data.r);
	reloading();

	const delta = $derived.by(() => {
		if (r.was == null) return '';
		if (r.was === 0) return 'first visits';
		const p = Math.abs(Math.round((100 * (r.views - r.was)) / r.was));
		return `${r.views >= r.was ? '+' : '−'}${p}% vs ${nf.format(r.was)} before`;
	});
	const pages = $derived(r.pages.map((p): [string, number] => [p.path, p.n]));
	const medians = $derived(new Map(r.pages.map((p) => [p.path, p.median])));
	const tagHref = (tag: string) => {
		const q = new URLSearchParams({ tag });
		if (r.who !== 'others') q.set('who', r.who);
		return `${resolve('/s/[site]', { site: r.site })}?${q}`;
	};
</script>

<svelte:head><title>{data.name} · Stats</title></svelte:head>

<SubBar
	site={r.site}
	who={r.who}
	days={r.tag ? undefined : r.days}
	mine={r.mineCount}
	others={r.othersCount}
	note={r.tag ? `tag ${r.tag}, all time` : `${r.from} – ${r.today}`}
/>

<div class="figs">
	<div>
		<span class="fig">{nf.format(r.views)}</span>
		<span class="fig-label">pages opened{delta ? ` · ${delta}` : ''}</span>
	</div>
	<div><span class="fig">{nf.format(r.entries)}</span><span class="fig-label">arrivals from outside</span></div>
	<div><span class="fig">{secs(r.median)}</span><span class="fig-label">typical time in view</span></div>
	<div><span class="fig">{r.depth == null ? '—' : `${r.depth}%`}</span><span class="fig-label">read, on average</span></div>
	<div><span class="fig">{r.clicked}%</span><span class="fig-label">opened something</span></div>
	<div><span class="fig">{r.phones}%</span><span class="fig-label">on a phone</span></div>
</div>

{#if r.bars.length}
	<div class="chart">
		<Bars bars={r.bars} unit={r.days === 1 ? 'hour' : 'day'} />
	</div>
{/if}

<div class="band">
	{#if r.site === 'all'}
		<RowList title="Sites" rows={r.sites} total={r.views}>
			{#snippet name(id)}<a href={resolve('/s/[site]', { site: id })}>{siteName(id)}</a>{/snippet}
		</RowList>
	{/if}
	<RowList title="Came from" rows={r.sources} total={r.views}>
		{#snippet name(k)}{SOURCES[k] ?? k}{/snippet}
	</RowList>
	<RowList title="Pages" rows={pages} total={r.views}>
		{#snippet name(path)}{path} <small class="muted">{secs(medians.get(path))}</small>{/snippet}
	</RowList>
	<RowList title="Referrers" rows={r.refs} total={r.views} />
	<RowList title="Opened" rows={r.opened} total={r.views} />
	<RowList title="Read · 3s or more" rows={r.read} total={r.views} />
	<RowList title="Places" rows={r.places} total={r.views} />
	<RowList title="Networks" rows={r.networks} total={r.views} note={r.business ? `${r.business} from a company` : undefined} />
	<RowList title="Languages" rows={r.langs} total={r.views} />
	<RowList title="Systems" rows={r.systems} total={r.views} />
	<RowList title="Screens" rows={r.screens} total={r.views} note={r.dark == null ? undefined : `${r.dark}% in dark mode`} />
	<section class="tags">
		<h2>Tagged links</h2>
		{#each r.tags as t (t.k)}
			<div><a href={tagHref(t.k)}>{t.k}</a><span>{nf.format(t.n)}</span></div>
		{:else}
			<p>None yet. Hand out {data.origin ?? 'a site'}/?r=company</p>
		{/each}
	</section>
</div>

<h2 class="section">Latest{r.views > r.recent.length ? ` · ${r.recent.length} of ${nf.format(r.views)}` : ''}</h2>
<VisitTable visits={r.recent} showSite={r.site === 'all'} {tagHref} />

{#if data.origin}
	<p class="mark">
		Counted as yours: anything from an address this page was opened on, and any browser that has opened
		<a href="{data.origin}/?stats=me" target="_blank" rel="noopener noreferrer">{data.name}/?stats=me</a>.
	</p>
{/if}

<style>
	.muted {
		color: var(--z-soft);
	}
	.tags h2 {
		margin: 0 0 8px;
		font-size: 12px;
		font-weight: 600;
		color: var(--z-muted);
	}
	.tags div {
		display: flex;
		justify-content: space-between;
		padding: 2px 0;
		font-size: 13px;
	}
	.tags span {
		font-family: var(--font-mono);
		font-size: 12px;
	}
	.tags p {
		margin: 0;
		font-size: 13px;
		color: var(--z-soft);
	}
	.mark {
		margin: 12px 0 0;
		font-size: 12.5px;
		color: var(--z-soft);
	}
	a {
		color: var(--z-link);
	}
</style>
