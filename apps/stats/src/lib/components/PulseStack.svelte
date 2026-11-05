<script lang="ts">
	// A site's days, one line each through the 24 hours, the oldest at the back. A
	// quiet night and a busy afternoon read straight off the shape, and a day that
	// stood out stands up out of the stack. The numbers are also a table.
	import { dayLabel, hourLabel, nf, opened, shortDay } from '#lib/format';
	import { BOX_H, BOX_W, linePaths } from '#lib/pulse';
	import type { StackRow } from '#lib/server/report';

	let { rows, peak }: { rows: StackRow[]; peak: number } = $props();

	const RISE = 92;
	const gap = $derived(rows.length <= 1 ? 0 : rows.length <= 7 ? 40 : rows.length <= 14 ? 28 : 13);
	const height = $derived(RISE + gap * Math.max(0, rows.length - 1));
	const paths = $derived(rows.map((r) => linePaths(r.hours, 24, peak, true)));
	// A date beside about every fourth line, and always the newest.
	const every = $derived(gap >= 28 ? 1 : 7);
	const nameOf = (r: StackRow) => (r.to ? `${shortDay(r.label)} – ${shortDay(r.to)}` : dayLabel(r.label));
	// Only the start of a week fits beside its line; the reading names the whole span.
	const shortName = (r: StackRow) => (r.to ? shortDay(r.label) : dayLabel(r.label));

	let at = $state<{ row: number; hour: number; x: number; y: number; right: boolean } | null>(null);
	function read(e: PointerEvent) {
		const plot = e.currentTarget as HTMLElement;
		const box = plot.getBoundingClientRect();
		const y = e.clientY - box.top;
		const row = gap ? Math.max(0, Math.min(rows.length - 1, Math.round((y - RISE) / gap))) : 0;
		const hour = Math.max(0, Math.min(23, Math.round(((e.clientX - box.left) / box.width) * 23)));
		at = { row, hour, x: e.clientX - box.left, y: RISE + gap * row, right: e.clientX - box.left > box.width / 2 };
	}
	const held = $derived(at ? rows[at.row] : null);
	const clear = (e: PointerEvent) => {
		if (!(e.target as Element).closest('figure .plot')) at = null;
	};
</script>

<svelte:window onpointerdown={clear} />

<figure>
	<div class="frame">
		<div class="dates" aria-hidden="true" style:height="{height}px">
			{#each rows as r, i (r.label)}
				{#if i === rows.length - 1 || (rows.length - 1 - i) % every === 0}
					<span style:top="{RISE + gap * i}px">{shortName(r)}</span>
				{/if}
			{/each}
		</div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="plot" style:height="{height}px" onpointermove={read} onpointerdown={read} onpointerleave={(e) => { if (e.pointerType !== 'touch') at = null; }}>
			{#each rows as r, i (r.label)}
				<svg viewBox="0 0 {BOX_W} {BOX_H}" preserveAspectRatio="none" aria-hidden="true" style:top="{gap * i}px" style:height="{RISE}px">
					<path class="area" d={paths[i].area} />
					<path class="line" class:flat={!r.n} class:held={at?.row === i} d={paths[i].line} vector-effect="non-scaling-stroke" />
					{#if paths[i].tail}<path class="tail" d={paths[i].tail} vector-effect="non-scaling-stroke" />{/if}
				</svg>
			{/each}
			{#if at && held}
				<div class="tip" class:right={at.right} style:left="{at.x}px" style:top="{at.y}px">
					<b>{nf.format(held.hours[at.hour] ?? 0)}</b> {opened(held.hours[at.hour] ?? 0)} · {nameOf(held)}, {hourLabel(at.hour)} · <b>{nf.format(held.n)}</b> {held.to ? 'that week' : 'that day'}
				</div>
			{/if}
		</div>
	</div>
	<div class="hours" aria-hidden="true">
		<span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
	</div>
	<table class="sr">
		<caption>Pages opened by {rows[0]?.to ? 'week' : 'day'}</caption>
		<tbody>
			{#each rows as r (r.label)}
				<tr><th scope="row">{nameOf(r)}</th><td>{r.n}</td></tr>
			{/each}
		</tbody>
	</table>
	<figcaption class="caption">
		Warsaw time.{rows[0]?.to ? ' Each line is a week, its hours added together.' : ''} Tallest reading: {nf.format(peak)} {opened(peak)} in {rows[0]?.to ? 'one hour of a week' : 'an hour'}. Heights are the counts themselves, on one scale for these lines. A dotted end is the hour still counting.
	</figcaption>
</figure>

<style>
	figure {
		position: relative;
		margin: 0;
		min-width: 0;
	}
	.frame {
		display: grid;
		grid-template-columns: 76px minmax(0, 1fr);
	}
	.dates {
		position: relative;
	}
	.dates span {
		position: absolute;
		left: 0;
		transform: translateY(-100%);
		font-size: 12px;
		line-height: 1;
		white-space: nowrap;
		color: var(--soft);
	}
	.plot {
		position: relative;
		touch-action: pan-y;
	}
	svg {
		position: absolute;
		left: 0;
		display: block;
		width: 100%;
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
		margin: 6px 0 0 76px;
		font-family: var(--mono);
		font-size: 11px;
		color: var(--soft);
	}
	figcaption {
		margin: 8px 0 0 76px;
	}
	@media (max-width: 720px) {
		.frame {
			grid-template-columns: 58px minmax(0, 1fr);
		}
		.dates span {
			font-size: 11px;
		}
		.hours,
		figcaption {
			margin-left: 58px;
		}
		/* A tap's reading sits under the plot, over the hours, and hides no line. */
		.tip {
			top: 100% !important;
			margin-top: 2px;
		}
	}
</style>
