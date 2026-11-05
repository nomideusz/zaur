<script lang="ts">
	// Who came, one page opened to a row. A row's time, depth and clicks fill in
	// while the reader is still on the page.
	import { clock, device, pageHref, place, secs, siteName, when } from '#lib/format';
	import { SOURCES } from '#lib/sources';
	import type { VisitRow } from '#lib/types';

	let { visits, showSite = false, live = false, tagHref, empty = 'No visits yet.' }: { visits: VisitRow[]; showSite?: boolean; live?: boolean; tagHref?: (tag: string) => string; empty?: string } = $props();
	const from = (v: VisitRow) => v.ref || (v.source === 'social' ? v.browser : SOURCES[v.source]) || '';
</script>

{#if visits.length}
	<div class="scroll" role="region" aria-label="Visits" tabindex="-1">
		<table>
			<thead>
				<tr>
					<th>When</th>
					{#if showSite}<th>Site</th>{/if}
					<th>Page</th>
					<th>From</th>
					<th>Where</th>
					<th>Network</th>
					<th>Device</th>
					<th class="num">Time</th>
					<th class="num">Read</th>
					<th>Looked at · opened</th>
				</tr>
			</thead>
			<tbody>
				{#each visits as v (v.site + v.id)}
					<tr>
						<td class="time count">{live ? clock(v.t) : when(v.t)}{#if v.me}<span class="yours">Mine</span>{/if}</td>
						{#if showSite}<td class="on-site"><a href="/s/{v.site}">{siteName(v.site)}</a></td>{/if}
						<td class="path"><a href={pageHref(v.site, v.path, v.host)} title={v.path} target="_blank" rel="noopener noreferrer">{v.path}</a></td>
						<td class="from">
							{#if v.tag}<i class="chip"></i>{/if}{#if v.tag && tagHref}<a href={tagHref(v.tag)}>{v.tag}</a>{:else if v.tag}{v.tag}{:else}{from(v)}{/if}
							{#if v.hash}{' '}<small>{v.hash}</small>{/if}
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
