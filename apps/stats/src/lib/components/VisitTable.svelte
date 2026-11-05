<script lang="ts">
	// Who came, one page opened to a row. A row's time, depth and clicks fill in
	// while the reader is still on the page.
	import { clock, device, pageHref, place, secs, siteName, when } from '#lib/format';
	import { SOURCES } from '#lib/sources';
	import type { VisitRow } from '#lib/types';

	let { visits, showSite = false, live = false, tagHref }: { visits: VisitRow[]; showSite?: boolean; live?: boolean; tagHref?: (tag: string) => string } = $props();
	const from = (v: VisitRow) => v.ref || (v.source === 'social' ? v.browser : SOURCES[v.source]) || '';
</script>

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
				<tr class:tagged={v.tag} class:mine={v.me}>
					<td class="time">{live ? clock(v.t) : when(v.t)}</td>
					{#if showSite}<td><a href="/s/{v.site}">{siteName(v.site)}</a></td>{/if}
					<td class="path"><a href={pageHref(v.site, v.path, v.host)} title={v.path} target="_blank" rel="noopener noreferrer">{v.path}</a></td>
					<td>
						{#if v.tag && tagHref}<a href={tagHref(v.tag)}>{v.tag}</a>{:else}{from(v)}{/if}
						{#if v.hash}{' '}<small>{v.hash}</small>{/if}
					</td>
					<td>
						{place(v)}{#if v.lang}{' '}<small>· {v.lang}</small>{/if}
						{#if v.region}<br /><small>{v.region}</small>{/if}
					</td>
					<td>
						{#if v.org_type === 'business'}<b>{v.org}</b>{:else}{v.org ?? ''}{/if}
						{#if v.hosting || v.vpn || v.mobile || v.org_type}
							<br /><small>{[v.hosting ? 'data centre' : v.org_type, v.vpn && 'VPN or proxy', v.mobile && 'mobile network'].filter(Boolean).join(' · ')}</small>
						{/if}
					</td>
					<td>
						{device(v)}{' '}<small>{v.w ?? ''}{v.h ? `×${v.h}` : ''}</small>
						{#if v.os}<br /><small>{v.os} · {v.browser}{v.dark ? ' · dark' : ''}</small>{/if}
						{#if v.agent}<br /><small><b>AI agent or cloud browser</b></small>{/if}
					</td>
					<td class="num">{secs(v.secs)}</td>
					<td class="num">{v.depth == null ? '—' : `${v.depth}%`}</td>
					<td class="wide">
						{Object.entries(v.seen ?? {}).map(([k, s]) => `${k} ${secs(s)}`).join(' · ')}
						{#if v.clicks?.length}<small>{v.seen ? ' — ' : ''}{v.clicks.join(' · ')}</small>{/if}
					</td>
				</tr>
			{:else}
				<tr><td colspan={showSite ? 10 : 9} class="none">No visits yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.scroll {
		overflow-x: auto;
		background: var(--z-surface);
		border: 1px solid var(--z-hairline);
		border-radius: 10px;
	}
	table {
		width: 100%;
		min-width: 1040px;
		border-collapse: collapse;
		font-size: 13px;
		color: var(--z-body);
	}
	th {
		padding: 8px 10px;
		font-size: 12px;
		font-weight: 600;
		text-align: left;
		color: var(--z-muted);
		white-space: nowrap;
	}
	td {
		padding: 6px 10px;
		border-top: 1px solid var(--z-hairline);
		vertical-align: top;
	}
	small {
		font-size: 12px;
		color: var(--z-soft);
	}
	a {
		color: inherit;
	}
	.time {
		white-space: nowrap;
		color: var(--z-soft);
		font-family: var(--font-mono);
		font-size: 12px;
	}
	.path {
		max-width: 260px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	th.num {
		text-align: right;
	}
	td.num {
		text-align: right;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: 12px;
	}
	.wide {
		min-width: 180px;
	}
	.none {
		color: var(--z-soft);
	}
	tr.tagged {
		background: var(--z-accent-tint);
	}
	tr.mine td:first-child {
		box-shadow: inset 3px 0 var(--z-accent);
	}
</style>
