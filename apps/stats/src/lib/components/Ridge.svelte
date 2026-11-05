<script lang="ts">
	// One line of readings. The ground under it hides the line behind, which is how
	// lines stack into a pulse. Pointer handling belongs to whoever holds the row.
	import { BOX_H, BOX_W, linePaths } from '#lib/pulse';

	let { values, slots, peak, label, linear = false, rolling = false }: { values: number[]; slots: number; peak: number; label: string; linear?: boolean; rolling?: boolean } = $props();
	const paths = $derived(linePaths(values, slots, peak, linear, rolling));
	const flat = $derived(!values.some((n) => n > 0));
</script>

<svg class="ridge" viewBox="0 0 {BOX_W} {BOX_H}" preserveAspectRatio="none" role="img" aria-label={label}>
	<path class="area" d={paths.area} />
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
