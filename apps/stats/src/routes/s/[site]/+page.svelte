<script lang="ts">
	import { change, nf, secs, shortDay, siteName, siteNo } from '#lib/format';
	import { reloading } from '#lib/reloading.svelte';
	import { groupOf, SOURCES } from '#lib/sources';
	import { viewHref } from '#lib/view';
	import PulseStack from '#lib/components/PulseStack.svelte';
	import RowList from '#lib/components/RowList.svelte';
	import SourceStrip from '#lib/components/SourceStrip.svelte';
	import VisitTable from '#lib/components/VisitTable.svelte';

	let { data } = $props();
	const r = $derived(data.r);
	reloading();

	const delta = $derived(r.was == null ? null : r.was === 0 ? (r.views ? 'first visits' : null) : `${change(r.views, r.was)} vs ${nf.format(r.was)} before`);
	const pages = $derived(r.pages.map((p): [string, number] => [p.path, p.n]));
	const medians = $derived(new Map(r.pages.map((p) => [p.path, p.median])));
	const here = $derived({ site: r.site, who: r.who, days: r.days });
	const tagQuery = $derived<Record<string, string>>(r.tag ? { tag: r.tag } : {});
	const tagHref = (tag: string) => viewHref({ ...here, days: 30, extra: { tag } });
	const tagRows = $derived(r.tags.map((t): [string, number] => [t.k, t.n]));
	const period = $derived(r.tag ? `tag ${r.tag}, all time` : r.days === 1 ? shortDay(r.today) : `${shortDay(r.from)} – ${shortDay(r.today)}`);
	const whoWord = $derived(r.who === 'mine' ? 'Yours' : r.who === 'all' ? 'Everyone' : 'Others');
	const emptyWord = $derived(r.who === 'mine' ? 'No visits of yours in this period.' : 'No visits in this period.');
</script>

<svelte:head><title>{data.name} · Stats</title></svelte:head>

<div class="title">
	{#if r.site !== 'all'}<span class="no count">{siteNo(r.site)}</span>{/if}
	<h1>{data.name}</h1>
	<p>{whoWord} · {period}{#if r.tag} · <a href={viewHref({ ...here, days: 30 })}>Clear the tag</a>{/if}</p>
	{#if data.origin}<a class="out" href={data.origin} target="_blank" rel="noopener noreferrer">Open the site</a>{/if}
</div>

<nav class="seg tabs" aria-label="Report">
	<a href={viewHref({ ...here, extra: tagQuery })} aria-current={data.visits ? undefined : 'page'}>Summary</a>
	<a href={viewHref({ ...here, extra: { ...tagQuery, view: 'visits' } })} aria-current={data.visits ? 'page' : undefined}>Visits{#if r.views}<span class="n count">{r.views > r.recent.length ? `${r.recent.length} of ${nf.format(r.views)}` : nf.format(r.views)}</span>{/if}</a>
</nav>

{#if data.visits}
	<VisitTable visits={r.recent} showSite={r.site === 'all'} {tagHref} empty={emptyWord} />
{:else}
	<div class="head">
		{#if r.views}
			<PulseStack rows={r.stack.rows} peak={r.stack.peak} />
		{:else}
			<p class="nothing">{emptyWord}{#if r.who === 'mine' && data.origin}{' '}Open <a href="{data.origin}/?stats=me" target="_blank" rel="noopener noreferrer">{data.name}/?stats=me</a> to count this browser as yours.{/if}</p>
		{/if}
		<dl class="credits">
			<div class="lead"><dt>Pages opened{#if delta}<span>{delta}</span>{/if}</dt><dd class="count">{nf.format(r.views)}</dd></div>
			<div><dt>Arrivals from outside</dt><dd class="count">{nf.format(r.entries)}</dd></div>
			<div><dt>Typical time in view</dt><dd class="count">{secs(r.median)}</dd></div>
			<div><dt>Read, on average</dt><dd class="count">{r.depth == null ? '—' : `${r.depth}%`}</dd></div>
			{#if data.detail}<div><dt>Opened something</dt><dd class="count">{r.views ? `${r.clicked}%` : '—'}</dd></div>{/if}
			<div><dt>On a phone</dt><dd class="count">{r.views ? `${r.phones}%` : '—'}</dd></div>
			{#if r.views}<div class="from"><dt>Came from</dt><dd><SourceStrip rows={r.sources} /></dd></div>{/if}
		</dl>
	</div>

	{#if r.views}
		<div class="band">
			{#if r.site === 'all'}
				<RowList title="Sites" rows={r.sites} total={r.views}>
					{#snippet name(id)}<a href={viewHref({ ...here, site: id })}>{siteNo(id)} {siteName(id)}</a>{/snippet}
				</RowList>
			{/if}
			<RowList title="Came from" rows={r.sources} total={r.views}>
				{#snippet name(k)}
					{@const g = groupOf(k)}
					<i class="chip" class:within={!g} style:background={g ? `var(--src-${g})` : undefined}></i>{SOURCES[k] ?? k}
				{/snippet}
			</RowList>
			<RowList title="Pages" rows={pages} total={r.views}>
				{#snippet name(path)}{path} <small>{secs(medians.get(path))}</small>{/snippet}
			</RowList>
			{#if data.detail}
				<RowList title="Tagged links" note={tagRows.length ? 'all time, latest first' : undefined} rows={tagRows} empty="None yet. Hand out {data.origin ?? 'a site'}/?r=company">
					{#snippet name(tag)}<a href={tagHref(tag)}>{tag}</a>{/snippet}
				</RowList>
			{/if}
			<RowList title="Referrers" rows={r.refs} total={r.views} />
			<RowList title="Places" rows={r.places} total={r.views} />
			<RowList title="Networks" rows={r.networks} total={r.views} note={r.business ? `${nf.format(r.business)} from a company` : undefined} />
			{#if data.detail}
				<RowList title="Opened" rows={r.opened} total={r.views} />
				<RowList title="Read · 3s or more" rows={r.read} total={r.views} />
			{/if}
			<RowList title="Languages" rows={r.langs} total={r.views} />
			<RowList title="Systems" rows={r.systems} total={r.views} />
			<RowList title="Screens" rows={r.screens} total={r.views} note={r.dark == null ? undefined : `${r.dark}% in dark mode`} />
		</div>
	{:else if tagRows.length}
		<div class="band">
			<RowList title="Tagged links" note="all time, latest first" rows={tagRows}>
				{#snippet name(tag)}<a href={tagHref(tag)}>{tag}</a>{/snippet}
			</RowList>
		</div>
	{/if}
{/if}

{#if data.origin}
	<p class="mark">
		Counted as yours: anything from an address this page was opened on, and any browser that has opened
		<a href="{data.origin}/?stats=me" target="_blank" rel="noopener noreferrer">{data.name}/?stats=me</a>.
	</p>
{/if}

<style>
	.title {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 14px;
		padding: 18px 0 16px;
	}
	.no {
		font-size: 34px;
		line-height: 1;
		color: var(--soft);
	}
	h1 {
		margin: 0;
		font-size: 34px;
		font-weight: 500;
		line-height: 1.05;
		letter-spacing: -0.015em;
		overflow-wrap: anywhere;
	}
	.title p {
		margin: 0;
		color: var(--soft);
	}
	.out {
		margin-left: auto;
	}
	.head {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
		gap: 32px;
		align-items: start;
		margin-bottom: 24px;
	}
	.nothing {
		margin: 0;
		padding: 48px 0;
		font-size: 15px;
		color: var(--soft);
	}
	.nothing a {
		color: var(--ink);
	}
	.credits {
		margin: 0;
	}
	.credits div {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		padding: 9px 0;
		border-bottom: 1px solid var(--rule);
	}
	.credits .lead {
		align-items: flex-end;
		padding-top: 0;
		border-bottom-color: var(--rule-strong);
	}
	dt {
		color: var(--soft);
	}
	dt span {
		display: block;
		margin-top: 2px;
		font-size: 12px;
	}
	dd {
		margin: 0;
		font-size: 15px;
	}
	.lead dd {
		font-size: 34px;
		font-variant-numeric: normal;
		line-height: 1;
	}
	.from {
		align-items: center !important;
	}
	.tabs {
		display: inline-flex;
		margin-bottom: 18px;
	}
	.n {
		margin-left: 8px;
		font-size: 11px;
		opacity: 0.85;
	}
	.band {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 28px 40px;
	}
	.chip {
		display: inline-block;
		width: 10px;
		height: 10px;
		margin-right: 7px;
	}
	.chip.within {
		border: 1px solid var(--rule-strong);
	}
	small {
		font-size: 12px;
		color: var(--soft);
	}
	.band a {
		text-decoration: none;
	}
	.band a:hover {
		text-decoration: underline;
	}
	.mark {
		margin: 20px 0 0;
		font-size: 12px;
		color: var(--soft);
	}
	@media (max-width: 1040px) {
		.head {
			grid-template-columns: minmax(0, 1fr);
		}
		.band {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 720px) {
		.title {
			padding-top: 14px;
		}
		.no,
		h1,
		.lead dd {
			font-size: 26px;
		}
		.out {
			margin-left: 0;
		}
		.tabs {
			display: flex;
		}
		.band {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
