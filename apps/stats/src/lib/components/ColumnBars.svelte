<script lang="ts">
	// One column a reading, from one baseline. The last reading is still counting, so
	// it is only outlined. Pointer handling belongs to whoever holds the chart.
	import { heightOf } from '#lib/pulse';

	let { values, slots, peak, linear = false, held = null }: { values: number[]; slots: number; peak: number; linear?: boolean; held?: number | null } = $props();
</script>

<div class="bars" class:holding={held != null} class:dense={slots > 45} style:--slots={slots} aria-hidden="true">
	{#each values as n, i (i)}
		<span class="slot">
			{#if n > 0}
				<i class:open={i === values.length - 1} class:held={held === i} style:height="{heightOf(n, peak, linear) * 100}%"></i>
			{/if}
		</span>
	{/each}
</div>

<style>
	.bars {
		/* Over any rules the chart draws behind it. */
		position: relative;
		display: grid;
		grid-template-columns: repeat(var(--slots), minmax(0, 1fr));
		height: 100%;
		pointer-events: none;
	}
	.slot {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		min-width: 0;
		height: 100%;
		padding: 0 1px;
	}
	.dense .slot {
		padding: 0 0.5px;
	}
	i {
		display: block;
		box-sizing: border-box;
		width: 100%;
		max-width: 24px;
		min-height: 2px;
		background: var(--line-ink, var(--ink));
		transition: background-color 150ms ease-out;
	}
	.holding i:not(.held) {
		background: var(--quiet-line);
	}
	/* The reading still counting: never solid, so it can't read as a bad day. */
	i.open,
	.holding i.open:not(.held) {
		background: none;
		border: 1px dashed var(--quiet-line);
	}
	i.open.held {
		background: none;
		border: 1px dashed var(--ink);
	}
	@media (prefers-reduced-motion: reduce) {
		i {
			transition: none;
		}
	}
</style>
