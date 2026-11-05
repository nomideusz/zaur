<script lang="ts">
	// The last hour and day as they land, over one stream: the server sends a new
	// picture when a beacon arrives, and when the minute turns and the lines shift.
	import { hourLabel, nf, opened, pageHref, secs, siteName, siteNo } from '#lib/format';
	import { pixelPath } from '#lib/pulse';
	import type { Live } from '#lib/types';
	import Ridge from '#lib/components/Ridge.svelte';
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
	const minutes = $derived(snap?.minutes ?? Array<number>(60).fill(0));
	const hours = $derived(snap?.hours ?? Array<number>(24).fill(0));
	const minutePeak = $derived(Math.max(1, ...minutes));
	const hourPeak = $derived(Math.max(1, ...hours));
	const lastHour = $derived(sum(minutes));
	const pagePeak = $derived(Math.max(1, ...(snap?.pages.map((p) => p.n) ?? [])));
	const hourStart = $derived(new Date((snap?.at ?? 0) - 23 * 3_600_000).toLocaleTimeString('en-GB', { timeZone: 'Europe/Warsaw', hour: '2-digit', hourCycle: 'h23' }));

	// A new visit at the top of the log sends one pulse along the line. A minute
	// turning changes the totals too, so this reads the visit, not the counts.
	let beats = $state(0);
	let seen: string | null = null;
	$effect(() => {
		const top = snap?.recent[0];
		if (!top) return;
		const key = top.site + top.id;
		if (seen && key !== seen) beats += 1;
		seen = key;
	});
	let plotW = $state(0);
	let plotH = $state(0);
	const beatPath = $derived(pixelPath(minutes, plotW, plotH, minutePeak));
	const clear = (e: PointerEvent) => {
		if (!(e.target as Element).closest('.plot')) tip = null;
	};

	let tip = $state<{ x: number; right: boolean; which: 'minute' | 'hour'; text: string; n: number } | null>(null);
	function read(e: PointerEvent, which: 'minute' | 'hour') {
		const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const values = which === 'minute' ? minutes : hours;
		const i = Math.max(0, Math.min(values.length - 1, Math.round(((e.clientX - box.left) / box.width) * (values.length - 1))));
		const ago = values.length - 1 - i;
		const text = which === 'minute' ? (ago ? `${ago} min ago` : 'this minute') : ago ? hourLabel((new Date((snap?.at ?? 0) - ago * 3_600_000).getUTCHours() + warsawOffset()) % 24) : 'this hour';
		tip = { x: e.clientX - box.left, right: e.clientX - box.left > box.width / 2, which, text, n: values[i] };
	}
	const warsawOffset = () => {
		const at = new Date(snap?.at ?? 0);
		return (Number(at.toLocaleString('en-GB', { timeZone: 'Europe/Warsaw', hour: '2-digit', hourCycle: 'h23' })) - at.getUTCHours() + 24) % 24;
	};
</script>

<svelte:window onpointerdown={clear} />

<svelte:head><title>Live · {data.name} · Stats</title></svelte:head>

<div class="title">
	{#if data.site !== 'all'}<span class="no count">{siteNo(data.site)}</span>{/if}
	<h1>{data.name}</h1>
	<p class="state" role="status" class:bad={!connected && snap}>
		<i></i>{#if connected}Live, up to date{:else if snap}Disconnected, reconnecting{:else}Connecting{/if}
	</p>
</div>

<dl class="figures">
	<div><dt>Last 5 minutes</dt><dd class="count">{snap ? nf.format(sum(minutes.slice(-5))) : '—'}</dd></div>
	<div><dt>30 minutes</dt><dd class="count">{snap ? nf.format(sum(minutes.slice(-30))) : '—'}</dd></div>
	<div><dt>An hour</dt><dd class="count">{snap ? nf.format(lastHour) : '—'}</dd></div>
	<div><dt>24 hours</dt><dd class="count">{snap ? nf.format(sum(hours)) : '—'}</dd></div>
</dl>

<div class="work">
<div class="lines" class:waiting={!snap}>
	<section>
		<h2>The last hour, minute by minute</h2>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="plot" bind:clientWidth={plotW} bind:clientHeight={plotH} onpointermove={(e) => read(e, 'minute')} onpointerdown={(e) => read(e, 'minute')} onpointerleave={(e) => { if (e.pointerType !== 'touch') tip = null; }}>
			<Ridge linear rolling values={minutes} slots={60} peak={minutePeak} label="Last hour: {nf.format(lastHour)} {opened(lastHour)}" />
			{#key beats}{#if beats && beatPath}<svg class="beat" viewBox="0 0 {plotW} {plotH}" aria-hidden="true"><path pathLength="100" d={beatPath} /></svg>{/if}{/key}
			{#if tip?.which === 'minute'}<div class="tip" class:right={tip.right} style:left="{tip.x}px"><b>{nf.format(tip.n)}</b> {opened(tip.n)} · {tip.text}</div>{/if}
		</div>
		<div class="axis caption"><span>an hour ago</span><span>at most {nf.format(minutePeak)} a minute</span><span>now</span></div>
	</section>
	<section>
		<h2>The last 24 hours</h2>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="plot short" onpointermove={(e) => read(e, 'hour')} onpointerdown={(e) => read(e, 'hour')} onpointerleave={(e) => { if (e.pointerType !== 'touch') tip = null; }}>
			<Ridge linear rolling values={hours} slots={24} peak={hourPeak} label="Last 24 hours: {nf.format(sum(hours))} {opened(sum(hours))}" />
			{#if tip?.which === 'hour'}<div class="tip" class:right={tip.right} style:left="{tip.x}px"><b>{nf.format(tip.n)}</b> {opened(tip.n)} · {tip.text}</div>{/if}
		</div>
		<div class="axis caption"><span class="count">{snap ? `${hourStart}:00` : ''}</span><span>at most {nf.format(hourPeak)} an hour</span><span>now</span></div>
	</section>
	<p class="caption dotted">Heights are the counts themselves. A dotted end is the reading still counting.</p>
</div>

{#if snap}
		<section class="pages">
			<h2>Pages · 24 hours</h2>
			{#each snap.pages as p (p.site + p.path)}
				<div class="row">
					<a href={pageHref(p.site, p.path)} title={p.path} target="_blank" rel="noopener noreferrer">
						{#if data.site === 'all'}<small>{siteName(p.site)} </small>{/if}{p.path}
					</a>
					<span class="n count">{nf.format(p.n)}<small>{secs(p.median)}</small></span>
					<span class="bar"><i style:width="{(100 * p.n) / pagePeak}%"></i></span>
				</div>
			{:else}
				<p class="none">No visits in the last 24 hours.</p>
			{/each}
		</section>
{/if}
</div>

{#if snap}
		<section class="latest">
			<h2>Latest</h2>
			<VisitTable visits={snap.recent} live showSite={data.site === 'all'} empty="Nothing has come in yet. New visits appear here as they land." />
		</section>
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
	.state {
		display: flex;
		align-items: center;
		gap: 7px;
		margin: 0 0 0 auto;
	}
	.state i {
		width: 9px;
		height: 9px;
		background: var(--ink);
	}
	.state.bad {
		color: var(--warn);
	}
	.state.bad i {
		background: var(--warn);
	}
	.figures {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		margin: 0 0 24px;
		border-top: 1px solid var(--rule-strong);
		border-bottom: 1px solid var(--rule);
	}
	.figures div {
		padding: 10px 0;
	}
	dt {
		color: var(--soft);
	}
	dd {
		margin: 2px 0 0;
		font-size: 28px;
		line-height: 1.1;
		font-variant-numeric: normal;
	}
	h2 {
		margin: 0 0 6px;
		font-size: 13px;
		font-weight: 600;
	}
	.lines {
		display: grid;
		gap: 24px;
		margin-bottom: 28px;
	}
	.lines.waiting .plot {
		opacity: 0.5;
	}
	.plot {
		position: relative;
		height: 150px;
		--rise: 150px;
		touch-action: pan-y;
		overflow: hidden;
		border-bottom: 1px solid var(--rule-strong);
	}
	.plot.short {
		height: 96px;
		--rise: 96px;
	}
	.plot:has(.tip) {
		overflow: visible;
		--line-weight: 2.4px;
	}
	.tip {
		top: 0;
	}
	.dotted {
		margin: -12px 0 0;
	}
	.axis span {
		white-space: nowrap;
	}
	.axis {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin-top: 4px;
	}
	/* One authored moment: when a visit lands, a bright stretch runs along the line once. */
	.beat {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.beat path {
		fill: none;
		stroke: var(--ink);
		stroke-width: 2.6px;
		stroke-linejoin: round;
		stroke-dasharray: 7 100;
		stroke-dashoffset: 7;
		opacity: 0;
		animation: beat 1400ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	@keyframes beat {
		0% {
			stroke-dashoffset: 7;
			opacity: 1;
		}
		85% {
			opacity: 1;
		}
		100% {
			stroke-dashoffset: -100;
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.beat {
			display: none;
		}
	}
	.work {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 340px;
		gap: 40px;
		align-items: start;
		margin-bottom: 28px;
	}
	.work .lines {
		margin-bottom: 0;
		min-width: 0;
	}
	.pages h2 {
		padding-bottom: 6px;
		border-bottom: 1px solid var(--rule-strong);
	}
	@media (max-width: 1040px) {
		.work {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: 12px;
		align-items: baseline;
		padding-top: 5px;
	}
	.row a {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-decoration: none;
	}
	.row a:hover {
		text-decoration: underline;
	}
	.n {
		font-size: 12px;
		white-space: nowrap;
	}
	.n small {
		display: inline-block;
		min-width: 62px;
		text-align: right;
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
	small {
		font-size: 11px;
		color: var(--soft);
	}
	.none {
		margin: 8px 0 0;
		color: var(--soft);
	}
	@media (max-width: 720px) {
		.no,
		h1 {
			font-size: 26px;
		}
		.state {
			flex-basis: 100%;
			margin-left: 0;
		}
		.figures {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.figures div:nth-child(-n + 2) {
			border-bottom: 1px solid var(--rule);
		}
		.plot {
			height: 120px;
			--rise: 120px;
		}
		.plot.short {
			height: 80px;
			--rise: 80px;
		}
		/* A tap's reading sits under the plot, over its axis, and hides no line. */
		.tip {
			top: 100%;
			margin-top: 2px;
		}
	}
</style>
