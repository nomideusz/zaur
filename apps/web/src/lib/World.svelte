<script lang="ts">
	import { onMount } from 'svelte';
	import { createWorld } from '@nomideusz/zaur-world';

	let canvas: HTMLCanvasElement;

	onMount(() => {
		// No dot grid (that's dino's graph paper) and no weather card —
		// here the sky is pure backdrop. Terrain shapes the horizon from
		// real nearby elevations; the real ISS crosses when it's overhead.
		const sky = createWorld(canvas, { gridColor: null, terrain: true, satellites: true });
		return () => sky.destroy();
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
