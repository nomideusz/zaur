<script lang="ts">
	import { addDayStr, change, dayLabel, hourLabel, nf, opened } from '#lib/format';
	import { reloading } from '#lib/reloading.svelte';
	import { SOURCE_GROUPS } from '#lib/sources';
	import { periodName, viewHref } from '#lib/view';
	import ColumnAxis from '#lib/components/ColumnAxis.svelte';
	import ColumnBars from '#lib/components/ColumnBars.svelte';
	import Ridge from '#lib/components/Ridge.svelte';
	import SourceStrip from '#lib/components/SourceStrip.svelte';
	import { perWord } from './overview';

	let { data } = $props();
	reloading();

	const sum = (pick: (s: (typeof data.sites)[number]) => number) => data.sites.reduce((a, s) => a + pick(s), 0);
	const was = $derived(data.sites.every((s) => s.was != null) ? sum((s) => s.was ?? 0) : null);
	const period = $derived(periodName(data.days));
	const columns = $derived(data.chart === 'days');
	const plotHeading = $derived(data.days === 1 ? 'Today, hour by hour, one scale for every site' : columns ? `${period}, day by day, one scale for every site` : `${period} through the day, one scale for every site`);
	const here = $derived({ who: data.who, days: data.days, chart: data.chart });

	// The reading under the pointer, placed on the board rather than in the row, so
	// the next row's line can't cover it.
	let board = $state<HTMLElement>();
	let tip = $state<{ x: number; y: number; right: boolean; label: string; n: number; site: string; i: number } | null>(null);

	function readingLabel(i: number) {
		if (columns && data.days > 1) return dayLabel(addDayStr(data.from, i));
		const perDay = 24 / data.step;
		const day = addDayStr(data.from, Math.floor(i / perDay));
		const hour = (i % perDay) * data.step;
		return data.step === 1 ? `${dayLabel(day)}, ${hourLabel(hour)}` : `${dayLabel(day)}, ${hourLabel(hour)}–${hourLabel(hour + data.step)}`;
	}
	function read(e: PointerEvent, s: (typeof data.sites)[number]) {
		const values = columns ? s.columns : s.pulse;
		const cell = e.currentTarget as HTMLElement;
		const box = cell.getBoundingClientRect();
		const outer = board!.getBoundingClientRect();
		const share = (e.clientX - box.left) / box.width;
		const i = columns ? Math.floor(share * data.columnSlots) : Math.round(share * (data.slots - 1));
		if (i < 0 || i >= values.length) {
			tip = null;
			return;
		}
		tip = {
			x: e.clientX - outer.left,
			y: (matchMedia('(max-width: 720px)').matches ? box.bottom : box.top) - outer.top,
			right: e.clientX - outer.left > outer.width / 2,
			label: readingLabel(i),
			n: values[i],
			site: s.id,
			i
		};
	}
	const clear = (e: PointerEvent) => {
		if (!(e.target as Element).closest('td.plot')) tip = null;
	};
	const ariaFor = (s: (typeof data.sites)[number]) => {
		const top = Math.max(...s.pulse);
		return top ? `${s.name}: ${nf.format(s.count)} ${opened(s.count)}, at most ${nf.format(top)} in one reading` : `${s.name}: no pages opened in this period`;
	};
</script>

<svelte:window onpointerdown={clear} />

<svelte:head><title>Stats</title></svelte:head>

<h1 class="sr">Overview of every site</h1>

<div class="board" bind:this={board}>
	<table class:columns>
		<thead>
			<tr>
				<th class="site" scope="col">No. · Site · came from</th>
				<th class="plot" scope="col">
					{plotHeading}
					{#if columns}<div class="dates"><ColumnAxis days={data.days} from={data.from} slots={data.columnSlots} /></div>{/if}
				</th>
				<th class="num" scope="col">{period}</th>
				<th class="num" scope="col">vs before</th>
				<th class="num" scope="col">Today</th>
				<th class="num" scope="col" title="Pages opened in the last 5 minutes. Opens the live page.">Now</th>
			</tr>
		</thead>
		<tbody>
			{#each data.sites as s (s.id)}
				<tr>
					<th class="site" scope="row">
						<a href={viewHref({ ...here, site: s.id })}>
							<span class="no count">{String(s.no).padStart(2, '0')}</span>
							<span class="name">{s.name}</span>
						</a>
						<span class="sources"><SourceStrip rows={s.sources} /></span>
					</th>
					<td class="plot" onpointermove={(e) => read(e, s)} onpointerdown={(e) => read(e, s)} onpointerleave={(e) => { if (e.pointerType !== 'touch') tip = null; }}>
						{#if columns}
							<div class="row-bars" role="img" aria-label={ariaFor(s)}>
								<ColumnBars values={s.columns} slots={data.columnSlots} peak={data.columnPeak} held={tip?.site === s.id ? tip.i : null} />
							</div>
						{:else}
							<Ridge values={s.pulse} slots={data.slots} peak={data.peak} label={ariaFor(s)} />
						{/if}
					</td>
					<td class="num count strong" data-label={period}>{nf.format(s.count)}</td>
					<td class="num count soft" data-label="vs before">{change(s.count, s.was)}</td>
					<td class="num count" data-label="Today">{nf.format(s.today)}</td>
					<td class="num count" data-label="Now"><a class:on={s.live} href={viewHref({ ...here, site: s.id, live: true })} aria-label="{s.name}: {s.live} in the last 5 minutes, watch live">{nf.format(s.live)}</a></td>
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<tr>
				<th class="site" scope="row"><a class="name" href={viewHref({ ...here, site: 'all' })}>All sites</a></th>
				<td class="plot">
					<ul class="legend">
						{#each SOURCE_GROUPS as g (g.id)}
							<li><i style:background="var(--src-{g.id})"></i>{g.label}</li>
						{/each}
					</ul>
				</td>
				<td class="num count strong" data-label={period}>{nf.format(sum((s) => s.count))}</td>
				<td class="num count soft" data-label="vs before">{change(sum((s) => s.count), was)}</td>
				<td class="num count" data-label="Today">{nf.format(sum((s) => s.today))}</td>
				<td class="num count" data-label="Now"><a href={viewHref({ site: 'all', who: data.who, days: data.days, live: true })}>{nf.format(sum((s) => s.live))}</a></td>
			</tr>
		</tfoot>
	</table>
	{#if tip}
		<div class="tip" class:right={tip.right} style:left="{tip.x}px" style:top="{tip.y}px"><b>{nf.format(tip.n)}</b> {opened(tip.n)} · {tip.label}</div>
	{/if}
</div>
{#if columns}
	<p class="caption scale">Tallest column: {nf.format(data.columnPeak)} {opened(data.columnPeak)} in {data.days === 1 ? 'an hour' : 'a day'}. A column's height is the square root of its count, so quiet sites keep their shape. A dashed outline is the {data.days === 1 ? 'hour' : 'day'} still counting.</p>
{:else}
	<p class="caption scale">Tallest reading: {nf.format(data.peak)} {opened(data.peak)} in {perWord(data.step)}. A line's height is the square root of its count, so quiet sites keep their shape. A dotted end is the reading still counting.</p>
{/if}

<style>
	.board {
		position: relative;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	thead th {
		padding: 16px 0 8px;
		font-size: 12px;
		font-weight: 400;
		text-align: left;
		color: var(--soft);
	}
	thead .num {
		text-align: right;
	}
	.site {
		width: 272px;
		text-align: left;
	}
	tbody .site,
	tfoot .site {
		padding: 0 16px calc(7px + var(--lift, 0px)) 0;
		vertical-align: bottom;
		font-weight: 400;
	}
	.site a {
		display: flex;
		align-items: baseline;
		gap: 12px;
		text-decoration: none;
	}
	.site a:hover .name {
		text-decoration: underline;
	}
	.no {
		width: 26px;
		font-size: 11px;
		color: var(--soft);
	}
	.name {
		font-size: 15px;
		font-weight: 500;
	}
	.sources {
		display: block;
		margin: 5px 0 0 38px;
	}
	tbody tr {
		height: 65px;
	}
	/* The first line needs the room the others take from the row above. */
	tbody tr:first-child {
		height: 112px;
	}
	tbody .plot {
		--rise: 112px;
		touch-action: pan-y;
	}
	/* The last line keeps clear of the rule under it. */
	tbody tr:last-child {
		--lift: 10px;
		height: 75px;
	}
	.plot {
		position: relative;
		padding: 0;
	}
	thead .plot {
		padding: 16px 0 8px;
	}
	tbody tr:is(:hover, :focus-within) {
		--line-weight: 2.4px;
	}
	tbody:has(tr:is(:hover, :focus-within)) tr:not(:hover, :focus-within) {
		--line-ink: var(--quiet-line);
	}
	.num {
		width: 90px;
		text-align: right;
		white-space: nowrap;
	}
	tbody .num,
	tfoot .num {
		padding: 0 0 calc(23px + var(--lift, 0px));
		vertical-align: bottom;
		font-size: 14px;
	}
	.num a {
		text-decoration: none;
	}
	.num a:hover {
		text-decoration: underline;
	}
	.on {
		font-weight: 600;
	}
	.strong {
		font-weight: 500;
	}
	.soft {
		color: var(--soft);
	}
	tfoot tr {
		border-top: 1px solid var(--rule-strong);
	}
	tfoot .site,
	tfoot .num {
		padding-top: 14px;
		padding-bottom: 14px;
		vertical-align: top;
	}
	tfoot .plot {
		padding: 14px 0;
		vertical-align: top;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 18px;
		margin: 0;
		padding: 0;
		font-size: 12px;
		color: var(--soft);
		list-style: none;
	}
	.legend i {
		display: inline-block;
		width: 12px;
		height: 10px;
		margin-right: 6px;
	}
	.tip {
		margin-top: -4px;
	}
	.scale {
		margin: 0;
		padding-top: 4px;
	}
	/* Columns keep to their own row: nothing rises behind its neighbour, and a rule is each one's baseline. */
	.dates {
		margin-top: 6px;
	}
	.columns tbody tr,
	.columns tbody tr:first-child,
	.columns tbody tr:last-child {
		--lift: 0px;
		height: 65px;
		border-bottom: 1px solid var(--rule);
	}
	.columns tbody .site {
		padding-top: 8px;
	}
	.columns tbody .num {
		padding-bottom: 8px;
	}
	.row-bars {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 54px;
	}

	@media (max-width: 1040px) {
		.site {
			width: 200px;
		}
		.num {
			width: 64px;
		}
		.name {
			font-size: 14px;
		}
	}

	/* On a phone each site is a short block: its line across the screen, the figures under it. */
	@media (max-width: 720px) {
		thead {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}
		table,
		tbody,
		tfoot {
			display: block;
		}
		tbody tr,
		tbody tr:first-child,
		tbody tr:last-child,
		tfoot tr {
			--lift: 0px;
			display: grid;
			grid-template-columns: repeat(3, 1fr) auto;
			align-items: baseline;
			height: auto;
			padding: 14px 0 12px;
			border-top: 1px solid var(--rule);
		}
		tfoot tr {
			border-top: 1px solid var(--rule-strong);
		}
		tbody .site,
		tfoot .site {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 6px 10px;
			grid-column: 1 / 4;
			width: auto;
			padding: 0;
		}
		.sources {
			margin: 0;
			align-self: center;
		}
		tbody .plot,
		tfoot .plot {
			grid-column: 1 / -1;
			grid-row: 2;
			height: 58px;
			padding: 0;
			--rise: 58px;
		}
		tfoot .plot {
			height: auto;
			padding: 10px 0;
		}
		.columns tbody tr,
		.columns tbody tr:first-child,
		.columns tbody tr:last-child {
			height: auto;
			border-bottom: 0;
		}
		.columns tbody .plot {
			margin-top: 8px;
		}
		.columns tbody .num {
			padding-bottom: 0;
		}
		.columns td.strong {
			padding: 0;
		}
		.row-bars {
			height: 100%;
			border-bottom: 1px solid var(--rule);
		}
		.tip {
			margin-top: 2px;
		}
		td.num,
		tfoot .num {
			display: block;
			width: auto;
			padding: 6px 0 0;
			text-align: left;
			font-size: 13px;
		}
		td.num::before {
			content: attr(data-label) ' ';
			font: 400 12px var(--sans);
			color: var(--soft);
		}
		/* The period's count sits beside the name, at the end of the first line. */
		td.strong {
			grid-column: 4;
			grid-row: 1;
			padding: 0;
			text-align: right;
			font-size: 15px;
		}
		td.strong::before {
			content: none;
		}
	}
</style>
