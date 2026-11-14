<script lang="ts">
	// The tallest reading, picked by hand as an observer marks an arrival on the drum:
	// a pencil leader up from the peak and the count written beside it. The plot's own
	// caption says the same, so a screen reader is not told twice. Its holder places it
	// with `at`, its `bottom` at the peak's height, or its `top` there and `up`.
	import { nf } from '#lib/format';

	let { n, x, at, up = false }: { n: number; x: number; at: string; up?: boolean } = $props();
	const left = $derived(x > 78);
</script>

<span class="pick" class:left style={at} style:left="{x}%" style:translate="{left ? '-100%' : '0'} {up ? '-100%' : '0'}" aria-hidden="true">
	<svg viewBox="0 0 24 20" width="24" height="20"><path d="M1 19C6 14 13 8 23 2" /></svg>
	<span>tallest {nf.format(n)}</span>
</span>

<style>
	.pick {
		position: absolute;
		z-index: 2;
		display: flex;
		align-items: flex-start;
		color: var(--pencil);
		pointer-events: none;
	}
	svg {
		flex: none;
		margin-top: 6px;
		overflow: visible;
		fill: none;
		stroke: currentColor;
		stroke-width: 1px;
		stroke-linecap: round;
	}
	span span {
		margin: -6px 0 0 2px;
		padding: 0 3px;
		font: 500 20px/1 var(--hand);
		/* Written on a clear patch of the record, so lines behind it do not cross it. */
		background: var(--ground);
		white-space: nowrap;
		transform: rotate(-4deg);
	}
	.left {
		flex-direction: row-reverse;
	}
	.left svg {
		transform: scaleX(-1);
	}
	.left span {
		margin: -6px 2px 0 0;
		transform: rotate(4deg);
	}
	@media (max-width: 720px) {
		.pick {
			display: none;
		}
	}
</style>
