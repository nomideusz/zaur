<script lang="ts">
	import { frameSvg, type FrameId } from '@zaur/sprite';

	let {
		frame = 'happy',
		size = 96,
		color = 'currentColor',
		label = ''
	}: {
		frame?: FrameId;
		/** Rendered width in px; height follows the sprite's aspect ratio. */
		size?: number;
		color?: string;
		/** Accessible label; omit (default) to mark the sprite decorative. */
		label?: string;
	} = $props();

	// Pure render — safe to prerender. scale=5 matches the 100×90 brand mark grid;
	// the wrapper scales it down to `size` via CSS.
	const svg = $derived(frameSvg(frame, { scale: 5, color }));
</script>

<span
	class="zw-sprite"
	style="width: {size}px"
	role={label ? 'img' : 'presentation'}
	aria-label={label || undefined}
	aria-hidden={label ? undefined : 'true'}
>
	{@html svg}
</span>

<style>
	.zw-sprite {
		display: inline-flex;
		line-height: 0;
	}

	.zw-sprite :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}
</style>
