<script lang="ts">
	// The last hour and day as they land, over one stream: the server sends a new
	// picture when a beacon arrives, and when the minute turns and the bars shift.
	import { pageHref, nf, secs, siteName } from '#lib/format';
	import type { Live } from '#lib/types';
	import Bars from '#lib/components/Bars.svelte';
	import SubBar from '#lib/components/SubBar.svelte';
	import VisitTable from '#lib/components/VisitTable.svelte';

	let { data } = $props();
	let snap = $state<Live | null>(null);
	let connected = $state(false);

	$effect(() => {
		const q = new URLSearchParams({ site: data.site, who: data.who });
		const stream = new EventSource(`/api/live?${q}`);
		stream.onopen = () => (connected = true);
		stream.onerror = () => (connected = false);
		stream.onmessage = (e) => {
			connected = true;
			snap = JSON.parse(e.data) as Live;
		};
		return () => stream.close();
	});

	const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
	const minuteBars = $derived(snap?.minutes.map((n, i) => ({ label: String(i), n })) ?? []);
	const hourBars = $derived(snap?.hours.map((n, i) => ({ label: String(i), n })) ?? []);
	const minuteTip = (b: { label: string }) => {
		const ago = 59 - Number(b.label);
		return ago ? `${ago} min ago` : 'this minute';
	};
	const hourLabel = (i: number) => {
		const at = new Date((snap?.at ?? 0) - (23 - i) * 3_600_000);
		return `${at.toLocaleTimeString('en-GB', { timeZone: 'Europe/Warsaw', hour: '2-digit' })}:00`;
	};
	const pagePeak = $derived(Math.max(1, ...(snap?.pages.map((p) => p.n) ?? [])));
</script>

<svelte:head><title>Live · {data.name} · Stats</title></svelte:head>

<SubBar site={data.site} who={data.who} live />

<p class="state">
	<span class={['dot', { on: connected, off: !connected && snap }]}></span>
	{#if connected}up to date{:else if snap}disconnected, reconnecting{:else}connecting{/if}
</p>

{#if snap}
	<div class="figs">
		<div><span class="fig">{nf.format(sum(snap.minutes.slice(-5)))}</span><span class="fig-label">pages opened · 5 min</span></div>
		<div><span class="fig">{nf.format(sum(snap.minutes.slice(-30)))}</span><span class="fig-label">30 min</span></div>
		<div><span class="fig">{nf.format(sum(snap.minutes))}</span><span class="fig-label">an hour</span></div>
		<div><span class="fig">{nf.format(sum(snap.hours))}</span><span class="fig-label">24 hours</span></div>
	</div>

	<div class="chart">
		<Bars bars={minuteBars} unit="minute" first="an hour ago" last="now" tip={minuteTip} />
	</div>
	<div class="chart">
		<Bars bars={hourBars} unit="hour" first={hourLabel(0)} last="now" tip={(b) => hourLabel(Number(b.label))} />
	</div>

	<h2 class="section">Pages · 24 hours</h2>
	<div class="pages">
		{#each snap.pages as p (p.site + p.path)}
			<div class="row">
				<a href={pageHref(p.site, p.path)} title={p.path} target="_blank" rel="noopener noreferrer">
					{#if data.site === 'all'}<small>{siteName(p.site)} </small>{/if}{p.path}
				</a>
				<span class="bar"><i style:width="{(100 * p.n) / pagePeak}%"></i></span>
				<span class="n">{nf.format(p.n)} <small>· {secs(p.median)}</small></span>
			</div>
		{:else}
			<p class="none">No visits.</p>
		{/each}
	</div>

	<h2 class="section">Latest</h2>
	<VisitTable visits={snap.recent} live showSite={data.site === 'all'} />
{/if}

<style>
	.state {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0 0 12px;
		font-size: 12.5px;
		color: var(--z-soft);
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--z-faint);
	}
	.dot.on {
		background: var(--z-ch-confirmed-stroke);
	}
	.dot.off {
		background: var(--z-ch-needs-stroke);
	}
	.pages {
		padding: 8px 14px;
		background: var(--z-surface);
		border: 1px solid var(--z-hairline);
		border-radius: 10px;
	}
	.row {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(40px, 1fr) 84px;
		align-items: center;
		gap: 10px;
		padding: 3px 0;
		font-size: 13px;
	}
	.row a {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--z-body);
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
		color: var(--z-soft);
	}
	.none {
		margin: 0;
		font-size: 13px;
		color: var(--z-soft);
	}
</style>
