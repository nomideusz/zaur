<script lang="ts">
	// A site's period as one line stepping once a day, on a plain linear scale, so one
	// day reads against another at a glance. Today, alone, steps once an hour. The
	// numbers are also a table.
	import { axisTicks } from '#lib/columns';
	import { addDayStr, dayLabel, hourLabel, nf, visitsWord } from '#lib/format';
	import { BOX_H } from '#lib/pulse';
	import ColumnAxis from './ColumnAxis.svelte';
	import Ridge from './Ridge.svelte';

	let { bars, days, from }: { bars: { label: string; n: number }[]; days: number; from: string } = $props();

	const hourly = $derived(days === 1);
	const slots = $derived(hourly ? 24 : days);
	const values = $derived(bars.map((b) => b.n));
	const tallest = $derived(Math.max(0, ...values));
	const tallestAt = $derived(values.indexOf(tallest));
	const ticks = $derived(axisTicks(tallest));
	const top = $derived(ticks.at(-1) ?? 1);
	const nameOf = (i: number) => (hourly ? hourLabel(i) : dayLabel(addDayStr(from, i)));
	const unit = $derived(hourly ? 'hour' : 'day');
	// A line's tallest reading stops short of the top of its box, so the rules do too.
	const place = (share: number) => (share * 100 * (BOX_H - 3)) / (BOX_H - 1);

	let at = $state<{ i: number; x: number; right: boolean } | null>(null);
	function read(e: PointerEvent) {
		const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = e.clientX - box.left;
		const i = Math.floor((x / box.width) * slots);
		at = i >= 0 && i < values.length ? { i, x, right: x > box.width / 2 } : null;
	}
	const clear = (e: PointerEvent) => {
		if (!(e.target as Element).closest('.chart-plot')) at = null;
	};
</script>

<svelte:window onpointerdown={clear} />

<figure class="chart">
	<div class="chart-frame">
		<div class="scale" aria-hidden="true">
			{#each ticks as t, i (i)}
				<span class="count" style:bottom="{place(i / 4)}%">{nf.format(t)}</span>
			{/each}
		</div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="chart-plot" onpointermove={read} onpointerdown={read} onpointerleave={(e) => { if (e.pointerType !== 'touch') at = null; }}>
			{#each [1, 2, 3, 4] as q (q)}
				<i class="grid" style:bottom="{place(q / 4)}%"></i>
			{/each}
			<div class="drawn">
				<Ridge steps stems linear {values} {slots} peak={top} held={at?.i ?? null} label="Visits by {unit}, at most {nf.format(tallest)}" />
			</div>
			{#if tallest}
				<span class="peak count" aria-hidden="true" style:left="{((tallestAt + 0.5) / slots) * 100}%" style:bottom="{place(tallest / top)}%">{nf.format(tallest)}</span>
			{/if}
			{#if at}
				<div class="tip" class:right={at.right} style:left="{at.x}px" style:top="0">
					<b>{nf.format(values[at.i])}</b> {visitsWord(values[at.i])} · {nameOf(at.i)}{at.i === values.length - 1 ? ', so far' : ''}
				</div>
			{/if}
		</div>
	</div>
	<div class="chart-axis"><ColumnAxis {days} {from} {slots} /></div>
	<table class="sr">
		<caption>Visits by {unit}</caption>
		<tbody>
			{#each values as n, i (i)}
				<tr><th scope="row">{nameOf(i)}</th><td>{n}</td></tr>
			{/each}
		</tbody>
	</table>
	<figcaption>
		<ul class="legend">
			<li>Warsaw time</li>
			<li class="still">{hourly ? 'this hour' : 'today'}, still counting</li>
		</ul>
	</figcaption>
</figure>

<style>
	.scale {
		position: relative;
	}
	.scale span {
		position: absolute;
		right: 10px;
		transform: translateY(50%);
		font-size: 11px;
		line-height: 1;
		color: var(--soft);
	}
	.grid {
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: var(--rule);
	}
	/* The line's own box, a little taller, so its zero falls on the baseline's rule. */
	.drawn {
		position: absolute;
		inset: 0;
		--rise: calc(100% * 100 / 99);
		--lift: calc(100% / -99);
	}
	.peak {
		position: absolute;
		margin-bottom: 5px;
		transform: translateX(-50%);
		font-size: 11px;
		line-height: 1;
		pointer-events: none;
	}
	@media (max-width: 720px) {
		.scale span {
			right: 7px;
		}
		/* A tap's reading sits under the plot, over the dates, and hides no column. */
		.tip {
			top: 100% !important;
			margin-top: 2px;
		}
	}
</style>
