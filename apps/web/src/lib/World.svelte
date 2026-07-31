<script lang="ts">
	import { onMount } from 'svelte';
	import { createWorld } from '@nomideusz/zaur-world';
	import { mountZaur } from '@nomideusz/zaur-world/zaur';

	let canvas: HTMLCanvasElement;

	onMount(() => {
		// No dot grid (that's dino's graph paper) and no weather card —
		// here the sky is pure backdrop. Terrain shapes the horizon from
		// real nearby elevations; the real ISS crosses when it's overhead.
		const sky = createWorld(canvas, { gridColor: null, terrain: true, satellites: true });
		// Zaur walks the bottom edge on his own overlay canvas, living in
		// the sky's weather: soaked in rain, sweater below 5 °C, snow crest.
		const zaur = mountZaur({
			floorY: () => window.innerHeight - 8,
			skyHour: () => new Date().getHours() + new Date().getMinutes() / 60,
			weather: () => sky.conditions()
		});
		return () => {
			zaur.destroy();
			sky.destroy();
		};
	});
</script>

<canvas bind:this={canvas} class="zw-sky" aria-hidden="true"></canvas>
<div class="zw-sky__scrim" aria-hidden="true"></div>

<style>
	.zw-sky,
	.zw-sky__scrim {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		/* Large-viewport height: the mobile URL bar collapsing during scroll
		   no longer resizes the canvas (which cleared it — visible blinking). */
		height: 100lvh;
		z-index: -1;
		pointer-events: none;
	}

	/* Theme-aware wash between sky and content: keeps text contrast at any
	   hour while the living sky shines through. Tracks the circadian palette
	   because it mixes from --z-surface. */
	.zw-sky__scrim {
		background: color-mix(in srgb, var(--z-surface) 45%, transparent);
	}
</style>
