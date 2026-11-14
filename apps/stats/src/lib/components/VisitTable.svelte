<script lang="ts">
	// Who came, one page opened to a row. A row's time, depth and clicks fill in
	// while the reader is still on the page.
	import { botReasonText } from '#lib/bots';
	import { clock, device, nf, pageHref, place, secs, siteName, when } from '#lib/format';
	import { SOURCES } from '#lib/sources';
	import type { VisitRow } from '#lib/types';
	import type { VisitSort } from '#lib/view';

	let {
		visits,
		showSite = false,
		live = false,
		tagHref,
		empty = 'No visits yet.',
		order,
		sortHref,
		pager
	}: {
		visits: VisitRow[];
		showSite?: boolean;
		live?: boolean;
		tagHref?: (tag: string) => string;
		empty?: string;
		/** The column the rows run by. With `sortHref`, a column's head is the link that chooses it. */
		order?: { by: VisitSort; asc: boolean };
		sortHref?: (by: VisitSort) => string;
		/** Where these rows stand among all of them, with the pages either side. */
		pager?: { first: number; of: number; prev?: string; next?: string };
	} = $props();
	// The order of the log's rows in report.ts reads the same words: keep the two alike.
	const from = (v: VisitRow) => v.ref || (v.source === 'social' ? v.browser : SOURCES[v.source]) || '';
</script>

{#snippet head(by: VisitSort, label: string, num = false)}
	{@const on = order?.by === by}
	<th class:num aria-sort={sortHref && on ? (order?.asc ? 'ascending' : 'descending') : undefined}>
		{#if sortHref}
			<a class="sort" class:on href={sortHref(by)} data-sveltekit-noscroll>
				{label}{#if on}<svg class:up={order?.asc} viewBox="0 0 8 8" width="8" height="8" aria-hidden="true"><path d="M4 0v7M1 4.5 4 7.5 7 4.5" /></svg>{/if}
			</a>
		{:else}{label}{/if}
	</th>
{/snippet}

{#if visits.length}
	<div class="scroll" role="region" aria-label="Visits" tabindex="-1">
		<table>
			<thead>
				<tr>
					{@render head('when', 'When')}
					{#if showSite}{@render head('site', 'Site')}{/if}
					{@render head('page', 'Page')}
					{@render head('from', 'From')}
					{@render head('where', 'Where')}
					{@render head('network', 'Network')}
					{@render head('device', 'Device')}
					{@render head('time', 'Time', true)}
					{@render head('read', 'Read', true)}
					<th>Looked at · opened</th>
				</tr>
			</thead>
			<tbody>
				{#each visits as v (v.site + v.id)}
					<tr>
						<td class="time count">{live ? clock(v.t) : when(v.t)}{#if v.me}<span class="yours">Mine</span>{/if}</td>
						{#if showSite}<td class="on-site"><a href="/s/{v.site}">{siteName(v.site)}</a></td>{/if}
						<td class="path"><a href={pageHref(v.site, v.path, v.host)} title={v.path} target="_blank" rel="noopener noreferrer">{v.path}</a></td>
						<td class="from" class:within={v.source === 'internal' && !v.tag}>
							{#if v.tag}<i class="chip"></i>{/if}{#if v.tag && tagHref}<a href={tagHref(v.tag)}>{v.tag}</a>{:else if v.tag}{v.tag}{:else}{from(v)}{/if}
							{#if v.hash}{' '}<small>{v.hash}</small>{/if}
							{#if v.again}<small class="line" title="The same browser, back within half an hour: part of its visit before">same visit</small>{/if}
						</td>
						<td>
							<span class="items"><span>{place(v)}</span>{#if v.lang}<small>{v.lang}</small>{/if}</span>
							{#if v.region}<small class="line">{v.region}</small>{/if}
						</td>
						<td class="net">
							{#if v.org_type === 'business'}<b>{v.org}</b>{:else}{v.org ?? ''}{/if}
							{#if v.hosting || v.vpn || v.mobile || v.org_type}
								<span class="items">{#each [v.hosting ? 'data centre' : v.org_type, v.vpn && 'VPN or proxy', v.mobile && 'mobile network'].filter(Boolean) as item (item)}<small>{item}</small>{/each}</span>
							{/if}
						</td>
						<td class="dev">
							<span class="whole">{device(v)}{' '}<small class="count">{v.w ?? ''}{v.h ? `×${v.h}` : ''}</small></span>
							{#if v.os}<span class="items"><small>{v.os}</small><small>{v.browser}</small>{#if v.dark}<small>dark</small>{/if}</span>{/if}
							{#if v.agent}<small class="line"><b>AI agent or cloud browser</b></small>{/if}
							{#if v.bot}<small class="line"><b>Bot:</b> {botReasonText(v.bot)}{#if v.tz && (v.bot === 'proxy' || v.bot === 'cloud' || v.bot === 'emulated')}{' '}({v.tz.replace(/_/g, ' ')}){/if}</small>{/if}
						</td>
						<td class="num count" data-label="Time">{secs(v.secs)}</td>
						<td class="num count" data-label="Read">{v.depth == null ? '—' : `${v.depth}%`}</td>
						<td class="wide">
							{Object.entries(v.seen ?? {}).map(([k, s]) => `${k} ${secs(s)}`).join(' · ')}
							{#if v.clicks?.length}<small>{v.seen ? ' — ' : ''}{v.clicks.join(' · ')}</small>{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if pager && pager.of > visits.length}
		<nav class="pager caption" aria-label="Pages of visits">
			<span>{nf.format(pager.first)}–{nf.format(pager.first + visits.length - 1)} of {nf.format(pager.of)}</span>
			{#if pager.prev}<a href={pager.prev}>Previous</a>{/if}
			{#if pager.next}<a href={pager.next}>Next</a>{/if}
		</nav>
	{/if}
{:else}
	<p class="none">{empty}</p>
{/if}

<style>
	.scroll {
		overflow-x: auto;
	}
	table {
		width: 100%;
		min-width: 1040px;
		border-collapse: collapse;
	}
	th {
		padding: 8px 12px 8px 0;
		font-size: 12px;
		font-weight: 400;
		text-align: left;
		white-space: nowrap;
		color: var(--soft);
		border-bottom: 1px solid var(--rule-strong);
	}
	td {
		padding: 8px 12px 8px 0;
		border-bottom: 1px solid var(--rule);
		vertical-align: top;
	}
	/* A head that orders the log: the chosen one in ink, its arrow after the word, or before a figure's. */
	.sort {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	.sort:hover,
	.sort.on {
		color: var(--ink);
	}
	.num .sort {
		flex-direction: row-reverse;
	}
	.sort svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.15px;
	}
	.sort svg.up {
		transform: scaleY(-1);
	}
	.pager {
		display: flex;
		gap: 18px;
		margin: 10px 0 0;
	}
	.pager a {
		color: var(--ink);
		text-decoration: underline;
	}
	small {
		font-size: 12px;
		color: var(--soft);
	}
	b {
		font-weight: 600;
	}
	a {
		text-decoration: none;
	}
	a:hover {
		text-decoration: underline;
	}
	.time {
		white-space: nowrap;
		font-size: 12px;
		color: var(--soft);
	}
	.line {
		display: block;
	}
	.whole {
		white-space: nowrap;
	}
	/* Where the width goes: the page and what was opened, not where it came from. */
	.from {
		width: 14%;
		overflow-wrap: anywhere;
	}
	/* A move within the site says nothing about where anyone came from. */
	.within {
		color: var(--soft);
	}
	.dev {
		min-width: 170px;
	}
	.items {
		display: flex;
		flex-wrap: wrap;
		column-gap: 13px;
		overflow: hidden;
	}
	.items > * {
		position: relative;
		white-space: nowrap;
	}
	.items > * + *::before {
		content: '·';
		position: absolute;
		left: -9px;
		color: var(--soft);
	}
	.yours {
		display: block;
		margin-top: 2px;
		font: 400 12px var(--sans);
		color: var(--ink);
	}
	.path {
		max-width: 260px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}
	.chip {
		display: inline-block;
		width: 10px;
		height: 10px;
		margin-right: 6px;
		background: var(--src-rest);
	}
	th.num,
	td.num {
		text-align: right;
		white-space: nowrap;
	}
	td.num {
		font-size: 12px;
	}
	.wide {
		min-width: 180px;
		padding-left: 12px;
	}
	.none {
		margin: 12px 0;
		color: var(--soft);
	}
	tbody tr:hover td {
		background: var(--raised);
	}

	/* A short stack per visit on a phone, in place of a table to scroll sideways. */
	@media (max-width: 720px) {
		table {
			display: block;
			min-width: 0;
		}
		thead {
			display: none;
		}
		tbody,
		tr {
			display: block;
		}
		tr {
			padding: 10px 0;
			border-bottom: 1px solid var(--rule);
		}
		td {
			display: block;
			padding: 1px 0;
			border: 0;
		}
		td:empty,
		.wide:not(:has(small)) {
			display: none;
		}
		.path {
			max-width: none;
			font-size: 15px;
		}
		.from {
			width: auto;
		}
		.yours {
			display: inline;
			margin-left: 8px;
		}
		td.num {
			display: inline-block;
			margin-right: 14px;
			text-align: left;
		}
		td.num::before {
			content: attr(data-label) ' ';
			font: 400 12px var(--sans);
			color: var(--soft);
		}
		.wide,
		.net,
		.dev {
			display: none;
		}
		tbody tr:hover td {
			background: none;
		}
	}
</style>
