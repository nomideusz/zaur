<script lang="ts">
	// One line of readings, through the hours or stepping a slot at a time. The ground
	// under it hides the line behind, which is how lines stack into a pulse. Pointer
	// handling belongs to whoever holds the row.
	import { BOX_H, BOX_W, columnBox, linePaths, stepPaths } from '#lib/pulse';

	let {
		values,
		slots,
		peak,
		label,
		linear = false,
		rolling = false,
		steps = false,
		stems = false,
		held = null
	}: { values: number[]; slots: number; peak: number; label: string; linear?: boolean; rolling?: boolean; steps?: boolean; stems?: boolean; held?: number | null } = $props();
	const paths = $derived<{ line: string; tail: string; area: string; stems?: string }>(steps ? stepPaths(values, slots, peak, linear) : linePaths(values, slots, peak, linear, rolling));
	const flat = $derived(!values.some((n) => n > 0));
	const box = $derived(steps && held != null && values[held] > 0 ? columnBox(held, values[held], slots, peak, linear) : null);
</script>

<svg class="ridge" viewBox="0 0 {BOX_W} {BOX_H}" preserveAspectRatio="none" role="img" aria-label={label}>
	<path class="area" d={paths.area} />
	{#if stems && paths.stems}<path class="stems" d={paths.stems} vector-effect="non-scaling-stroke" />{/if}
	{#if box}<rect class="held" x={box.x} y={box.y} width={box.width} height={box.height} />{/if}
	<path class="line" class:flat d={paths.line} vector-effect="non-scaling-stroke" />
	{#if paths.tail}<path class="tail" d={paths.tail} vector-effect="non-scaling-stroke" />{/if}
</svg>

<style>
	.ridge {
		position: absolute;
		left: 0;
		bottom: var(--lift, 0px);
		display: block;
		width: 100%;
		height: var(--rise, 118px);
		overflow: visible;
		pointer-events: none;
	}
	.area {
		fill: var(--ground);
	}
	.stems {
		fill: none;
		stroke: var(--rule);
		stroke-width: 1px;
	}
	.held {
		fill: var(--ink);
	}
	.line {
		fill: none;
		stroke: var(--line-ink, var(--ink));
		stroke-width: var(--line-weight, 1.15px);
		stroke-linejoin: round;
		transition: stroke-width 150ms ease-out, stroke 150ms ease-out;
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
	@media (prefers-reduced-motion: reduce) {
		.line {
			transition: none;
		}
	}
</style>
