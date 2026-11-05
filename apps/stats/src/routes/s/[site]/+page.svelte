<script lang="ts">
	import { change, nf, secs, shortDay, siteName, siteNo } from '#lib/format';
	import { reloading } from '#lib/reloading.svelte';
	import { groupOf, SOURCES } from '#lib/sources';
	import { viewHref } from '#lib/view';
	import Chapter from '#lib/components/Chapter.svelte';
	import DayColumns from '#lib/components/DayColumns.svelte';
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
	const here = $derived({ site: r.site, who: r.who, days: r.days, chart: data.chart });
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
	<p>
		{whoWord} · {period}{#if r.tag}{' '}· <a href={viewHref({ ...here, days: 30 })}>Clear the tag</a>{/if}{#if data.origin}{' '}· <a href={data.origin} target="_blank" rel="noopener noreferrer">Open the site</a>{/if}
	</p>
	<nav class="seg tabs" aria-label="Report">
		<a href={viewHref({ ...here, extra: tagQuery })} aria-current={data.visits ? undefined : 'page'}>Summary</a>
		<a href={viewHref({ ...here, extra: { ...tagQuery, view: 'visits' } })} aria-current={data.visits ? 'page' : undefined}>Visits{#if r.views}<span class="n count">{r.views > r.recent.length ? `${r.recent.length} of ${nf.format(r.views)}` : nf.format(r.views)}</span>{/if}</a>
	</nav>
</div>

{#if data.visits}
	<VisitTable visits={r.recent} showSite={r.site === 'all'} {tagHref} empty={emptyWord} />
{:else}
	<div class="head">
		{#if r.views}
			<!-- A tag's days are only those with visits, so they don't make an even row of days. -->
			{#if data.chart === 'days' && !r.tag}
				<DayColumns bars={r.bars} days={r.days} from={r.from} />
			{:else}
				<PulseStack rows={r.stack.rows} peak={r.stack.peak} />
			{/if}
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

	{#snippet tagged(limit: number, fill: number)}
		<RowList title="Tagged links" note={tagRows.length ? 'all time, latest first' : undefined} rows={tagRows} {limit} {fill} empty="None yet. Hand out {data.origin ?? 'a site'}/?r=company">
			{#snippet name(tag)}<a href={tagHref(tag)}>{tag}</a>{/snippet}
		</RowList>
	{/snippet}

	{#if r.views}
		<div class="band">
			{#if r.site === 'all'}
				<Chapter title="Sites" lengths={[r.sites.length]} flow={3}>
					{#snippet children(limit)}
						<RowList title="Pages opened" rows={r.sites} total={r.views} shares {limit} flow={3}>
							{#snippet name(id)}<a href={viewHref({ ...here, site: id })}>{siteNo(id)} {siteName(id)}</a>{/snippet}
						</RowList>
					{/snippet}
				</Chapter>
			{/if}
			<Chapter title="Arrivals" lengths={data.detail ? [r.sources.length, r.refs.length, tagRows.length] : [r.sources.length, r.refs.length]}>
				{#snippet children(limit, fill)}
					<RowList title="Came from" rows={r.sources} total={r.views} shares {limit} {fill}>
						{#snippet name(k)}
							{@const g = groupOf(k)}
							<i class="chip" class:within={!g} style:background={g ? `var(--src-${g})` : undefined}></i>{SOURCES[k] ?? k}
						{/snippet}
					</RowList>
					<RowList title="Referrers" rows={r.refs} total={r.views} {limit} {fill} />
					{#if data.detail}{@render tagged(limit, fill)}{/if}
				{/snippet}
			</Chapter>
			<Chapter title="Pages" lengths={data.detail ? [pages.length, r.opened.length, r.read.length] : [pages.length]} flow={data.detail ? 1 : 3}>
				{#snippet children(limit, fill)}
					<RowList title="Opened most" rows={pages} total={r.views} {limit} {fill} detailHead="in view" flow={data.detail ? 1 : 3}>
						{#snippet detail(path)}{secs(medians.get(path))}{/snippet}
					</RowList>
					{#if data.detail}
						<RowList title="Clicked" rows={r.opened} total={r.views} {limit} {fill} />
						<RowList title="Read, 3s or more" rows={r.read} total={r.views} {limit} {fill} />
					{/if}
				{/snippet}
			</Chapter>
			<Chapter title="Location" lengths={[r.places.length, r.networks.length, r.langs.length]}>
				{#snippet children(limit, fill)}
					<RowList title="Places" rows={r.places} total={r.views} {limit} {fill} />
					<RowList title="Networks" rows={r.networks} total={r.views} {limit} {fill} note={r.business ? `${nf.format(r.business)} from a company` : undefined} />
					<RowList title="Languages" rows={r.langs} total={r.views} {limit} {fill} />
				{/snippet}
			</Chapter>
			<Chapter title="Devices" lengths={[r.systems.length, r.screens.length]}>
				{#snippet children(limit, fill)}
					<RowList title="Systems" rows={r.systems} total={r.views} {limit} {fill} />
					<RowList title="Screens" rows={r.screens} total={r.views} {limit} {fill} note={r.dark == null ? undefined : `${r.dark}% in dark mode`} />
				{/snippet}
			</Chapter>
		</div>
	{:else if tagRows.length}
		<div class="band">
			<Chapter title="Arrivals" lengths={[tagRows.length]}>
				{#snippet children(limit, fill)}{@render tagged(limit, fill)}{/snippet}
			</Chapter>
		</div>
	{/if}
{/if}

{#if data.origin && r.who === 'mine'}
	<p class="mark">
		Counted as yours: addresses this page was opened from, and browsers that have opened
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
	.tabs {
		margin-left: auto;
		align-self: center;
	}
	.head {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
		gap: 32px;
		align-items: start;
		margin-bottom: 36px;
	}
	.nothing {
		min-height: 449px;
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
	.n {
		margin-left: 8px;
		font-size: 11px;
		opacity: 0.85;
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
	.band :global(a) {
		text-decoration: none;
	}
	.band :global(a:hover) {
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
		.nothing {
			min-height: 0;
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
		.title p {
			flex-basis: 100%;
		}
		.tabs {
			display: flex;
			flex-basis: 100%;
			margin: 8px 0 0;
		}
	}
</style>
