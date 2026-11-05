<script lang="ts">
	// A site's period as one column a day, on a plain linear scale, so one day reads
	// against another at a glance. Today, alone, is a column an hour. The numbers are
	// also a table.
	import { axisTicks } from '#lib/columns';
	import { addDayStr, dayLabel, hourLabel, nf, opened } from '#lib/format';
	import ColumnAxis from './ColumnAxis.svelte';
	import ColumnBars from './ColumnBars.svelte';

	let { bars, days, from }: { bars: { label: string; n: number }[]; days: number; from: string } = $props();

	const hourly = $derived(days === 1);
	const slots = $derived(hourly ? 24 : days);
	const values = $derived(bars.map((b) => b.n));
	const tallest = $derived(Math.max(0, ...values));
	const tallestAt = $derived(values.indexOf(tallest));
	const latest = $derived(values.at(-1) ?? 0);
	const ticks = $derived(axisTicks(tallest));
	const top = $derived(ticks.at(-1) ?? 1);
	const nameOf = (i: number) => (hourly ? hourLabel(i) : dayLabel(addDayStr(from, i)));
	const unit = $derived(hourly ? 'hour' : 'day');

	let at = $state<{ i: number; x: number; right: boolean } | null>(null);
	function read(e: PointerEvent) {
		const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = e.clientX - box.left;
		const i = Math.floor((x / box.width) * slots);
		at = i >= 0 && i < values.length ? { i, x, right: x > box.width / 2 } : null;
	}
	const clear = (e: PointerEvent) => {
		if (!(e.target as Element).closest('figure .plot')) at = null;
	};
</script>

<svelte:window onpointerdown={clear} />

<figure>
	<div class="frame">
		<div class="scale" aria-hidden="true">
			{#each ticks as t (t)}
				<span class="count" style:bottom="{(t / top) * 100}%">{nf.format(t)}</span>
			{/each}
		</div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="plot" onpointermove={read} onpointerdown={read} onpointerleave={(e) => { if (e.pointerType !== 'touch') at = null; }}>
			{#each ticks as t (t)}
				<i class="grid" class:base={t === 0} style:bottom="{(t / top) * 100}%"></i>
			{/each}
			<ColumnBars {values} {slots} peak={top} linear held={at?.i ?? null} />
			{#if tallest}
				<span class="peak count" aria-hidden="true" style:left="{((tallestAt + 0.5) / slots) * 100}%" style:bottom="{(tallest / top) * 100}%">{nf.format(tallest)}</span>
			{/if}
			{#if at}
				<div class="tip" class:right={at.right} style:left="{at.x}px" style:top="0">
					<b>{nf.format(values[at.i])}</b> {opened(values[at.i])} · {nameOf(at.i)}{at.i === values.length - 1 ? ', so far' : ''}
				</div>
			{/if}
		</div>
	</div>
	<div class="dates"><ColumnAxis {days} {from} {slots} /></div>
	<table class="sr">
		<caption>Pages opened by {unit}</caption>
		<tbody>
			{#each values as n, i (i)}
				<tr><th scope="row">{nameOf(i)}</th><td>{n}</td></tr>
			{/each}
		</tbody>
	</table>
	<figcaption class="caption">
		Warsaw time. Tallest {unit}: {nf.format(tallest)} {opened(tallest)}{tallest ? `, ${nameOf(tallestAt)}` : ''}. {hourly ? 'This hour' : 'Today'} so far: {nf.format(latest)}, drawn as a dashed outline until it is whole. Heights are the counts themselves, from zero.
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
		grid-template-columns: 44px minmax(0, 1fr);
		height: 300px;
		/* Room for the tallest column's figure above the top of the scale. */
		padding-top: 18px;
	}
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
	.plot {
		position: relative;
		min-width: 0;
		touch-action: pan-y;
	}
	.grid {
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: var(--rule);
	}
	.grid.base {
		background: var(--rule-strong);
	}
	.peak {
		position: absolute;
		margin-bottom: 4px;
		transform: translateX(-50%);
		font-size: 11px;
		line-height: 1;
		pointer-events: none;
	}
	.dates {
		margin: 6px 0 0 44px;
	}
	figcaption {
		margin: 8px 0 0 44px;
	}
	@media (max-width: 720px) {
		.frame {
			grid-template-columns: 36px minmax(0, 1fr);
			height: 220px;
		}
		.scale span {
			right: 7px;
		}
		.dates,
		figcaption {
			margin-left: 36px;
		}
		/* A tap's reading sits under the plot, over the dates, and hides no column. */
		.tip {
			top: 100% !important;
			margin-top: 2px;
		}
	}
</style>
