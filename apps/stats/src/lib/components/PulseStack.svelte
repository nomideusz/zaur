<script lang="ts">
	// A site's days, one line each through the 24 hours, the oldest at the back. A
	// quiet night and a busy afternoon read straight off the shape, and a day that
	// stood out stands up out of the stack. The numbers are also a table.
	import { dayLabel, hourLabel, nf, shortDay, visitsWord } from '#lib/format';
	import { BOX_H, BOX_W, linePaths } from '#lib/pulse';
	import type { StackRow } from '#lib/server/report';

	let { rows, peak }: { rows: StackRow[]; peak: number } = $props();

	// How much of the frame one line rises: the frame stays the same height however
	// many lines share it, so lines only ever sit closer or further apart.
	const rise = $derived(rows.length <= 1 ? 1 : rows.length <= 14 ? 0.3 : 0.23);
	const placeOf = (i: number) => (rows.length > 1 ? i / (rows.length - 1) : 0);
	const paths = $derived(rows.map((r) => linePaths(r.hours, 24, peak, true)));
	// A date beside about every fourth line, and always the newest.
	const every = $derived(rows.length <= 14 ? 1 : 7);
	const nameOf = (r: StackRow) => (r.to ? `${shortDay(r.label)} – ${shortDay(r.to)}` : dayLabel(r.label));
	// Only the start of a week fits beside its line; the reading names the whole span.
	const shortName = (r: StackRow) => (r.to ? shortDay(r.label) : dayLabel(r.label));

	let at = $state<{ row: number; hour: number; x: number; y: number; right: boolean } | null>(null);
	function read(e: PointerEvent) {
		const plot = e.currentTarget as HTMLElement;
		const box = plot.getBoundingClientRect();
		const top = rise * box.height;
		const gap = rows.length > 1 ? (box.height - top) / (rows.length - 1) : 0;
		const row = gap ? Math.max(0, Math.min(rows.length - 1, Math.round((e.clientY - box.top - top) / gap))) : 0;
		const hour = Math.max(0, Math.min(23, Math.round(((e.clientX - box.left) / box.width) * 23)));
		at = { row, hour, x: e.clientX - box.left, y: top + gap * row, right: e.clientX - box.left > box.width / 2 };
	}
	const held = $derived(at ? rows[at.row] : null);
	const clear = (e: PointerEvent) => {
		if (!(e.target as Element).closest('.chart-plot')) at = null;
	};
</script>

<svelte:window onpointerdown={clear} />

<figure class="chart" style:--r="{rise * 100}%">
	<div class="chart-frame">
		<div class="dates" aria-hidden="true">
			{#each rows as r, i (r.label)}
				{#if i === rows.length - 1 || (rows.length - 1 - i) % every === 0}
					<span style:--f={placeOf(i)}>{shortName(r)}</span>
				{/if}
			{/each}
		</div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="chart-plot" onpointermove={read} onpointerdown={read} onpointerleave={(e) => { if (e.pointerType !== 'touch') at = null; }}>
			{#each rows as r, i (r.label)}
				<svg viewBox="0 0 {BOX_W} {BOX_H}" preserveAspectRatio="none" aria-hidden="true" style:--f={placeOf(i)}>
					<path class="area" d={paths[i].area} />
					<path class="line" class:flat={!r.n} class:held={at?.row === i} d={paths[i].line} vector-effect="non-scaling-stroke" />
					{#if paths[i].tail}<path class="tail" d={paths[i].tail} vector-effect="non-scaling-stroke" />{/if}
				</svg>
			{/each}
			{#if at && held}
				<div class="tip" class:right={at.right} style:left="{at.x}px" style:top="{at.y}px">
					<b>{nf.format(held.hours[at.hour] ?? 0)}</b> {visitsWord(held.hours[at.hour] ?? 0)} · {nameOf(held)}, {hourLabel(at.hour)} · <b>{nf.format(held.n)}</b> {held.to ? 'that week' : 'that day'}
				</div>
			{/if}
		</div>
	</div>
	<div class="chart-axis hours" aria-hidden="true">
		<span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
	</div>
	<table class="sr">
		<caption>Visits by {rows[0]?.to ? 'week' : 'day'}</caption>
		<tbody>
			{#each rows as r (r.label)}
				<tr><th scope="row">{nameOf(r)}</th><td>{r.n}</td></tr>
			{/each}
		</tbody>
	</table>
	<figcaption>
		<ul class="legend">
			<li>Warsaw time</li>
			{#if rows[0]?.to}<li>one line a week</li>{/if}
			<li>tallest <b>{nf.format(peak)}</b> in an hour</li>
			<li class="still">this hour, still counting</li>
		</ul>
	</figcaption>
</figure>

<style>
	.dates {
		position: relative;
	}
	/* A date sits on its line's baseline. */
	.dates span {
		position: absolute;
		left: 0;
		top: calc(var(--r) + (100% - var(--r)) * var(--f));
		transform: translateY(-100%);
		font-size: 12px;
		line-height: 1;
		white-space: nowrap;
		color: var(--soft);
	}
	/* The box a little taller than the rise, so a line's zero falls on its baseline. */
	svg {
		position: absolute;
		left: 0;
		top: calc((100% - var(--r)) * var(--f));
		display: block;
		width: 100%;
		height: calc(var(--r) * 100 / 99);
		overflow: visible;
		pointer-events: none;
	}
	.area {
		fill: var(--ground);
	}
	.line {
		fill: none;
		stroke: var(--ink);
		stroke-width: 1.15px;
		stroke-linejoin: round;
	}
	.line.flat {
		stroke: var(--quiet-line);
	}
	.tail {
		fill: none;
		stroke: var(--quiet-line);
		stroke-width: 1px;
		stroke-dasharray: 2 3;
	}
	.line.held {
		stroke-width: 2.4px;
	}
	.tip {
		margin-top: 6px;
	}
	.hours {
		display: flex;
		justify-content: space-between;
		font-family: var(--mono);
		font-size: 11px;
		line-height: 15px;
		color: var(--soft);
	}
	@media (max-width: 720px) {
		.dates span {
			font-size: 11px;
		}
		/* A tap's reading sits under the plot, over the hours, and hides no line. */
		.tip {
			top: 100% !important;
			margin-top: 2px;
		}
	}
</style>
