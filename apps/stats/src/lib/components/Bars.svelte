<script lang="ts">
	// One measure over time: thin bars from one baseline, a tooltip on the column
	// under the pointer, and the same numbers as a table for a screen reader.
	import { nf } from '#lib/format';

	type Bar = { label: string; n: number };
	let {
		bars,
		unit,
		first,
		last,
		compact = false,
		tip = (b: Bar) => b.label
	}: { bars: Bar[]; unit: string; first?: string; last?: string; compact?: boolean; tip?: (b: Bar) => string } = $props();

	const peak = $derived(Math.max(1, ...bars.map((b) => b.n)));
	let at = $state<number | null>(null);
</script>

<div class={['plot', { compact }]}>
	<div class="columns" role="presentation" onpointerleave={() => (at = null)}>
		{#each bars as b, i (b.label)}
			<div class="column" role="presentation" onpointerenter={() => (at = i)}>
				<i class:empty={!b.n} style:height="{(100 * b.n) / peak}%"></i>
			</div>
		{/each}
		{#if at !== null && bars[at]}
			<div class="tip" style:left="{(100 * (at + 0.5)) / bars.length}%" class:right={at > bars.length / 2}>
				<b>{nf.format(bars[at].n)}</b>
				<span>{tip(bars[at])}</span>
			</div>
		{/if}
	</div>
	{#if !compact}
		<div class="axis">
			<span>{first ?? bars[0]?.label}</span>
			<span>at most {nf.format(peak)} per {unit}</span>
			<span>{last ?? bars.at(-1)?.label}</span>
		</div>
	{/if}
	<table class="sr">
		<tbody>
			{#each bars as b (b.label)}
				<tr><th scope="row">{b.label}</th><td>{b.n}</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.plot {
		position: relative;
	}
	.columns {
		position: relative;
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 96px;
		border-bottom: 1px solid var(--z-line);
	}
	.compact .columns {
		height: 26px;
		gap: 1px;
		border-bottom-color: var(--z-hairline);
	}
	.column {
		flex: 1 1 0;
		min-width: 0;
		height: 100%;
		display: flex;
		align-items: flex-end;
	}
	.column i {
		display: block;
		width: 100%;
		max-width: 28px;
		margin: 0 auto;
		min-height: 1px;
		background: var(--z-accent);
		border-radius: 3px 3px 0 0;
	}
	.compact .column i {
		border-radius: 1px 1px 0 0;
		background: var(--z-accent-stroke);
	}
	.column i.empty {
		background: transparent;
	}
	.column:hover i:not(.empty) {
		background: var(--z-accent-edge);
	}
	.tip {
		position: absolute;
		bottom: calc(100% + 4px);
		transform: translateX(-50%);
		z-index: 2;
		display: flex;
		gap: 6px;
		padding: 3px 8px;
		white-space: nowrap;
		font-size: 12px;
		background: var(--z-surface);
		color: var(--z-body);
		border: 1px solid var(--z-line);
		border-radius: 6px;
		pointer-events: none;
	}
	.tip.right {
		transform: translateX(-90%);
	}
	.tip span {
		color: var(--z-soft);
	}
	.axis {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin-top: 4px;
		font-size: 12px;
		color: var(--z-soft);
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
