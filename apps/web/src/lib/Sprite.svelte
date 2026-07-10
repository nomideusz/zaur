<script lang="ts">
	import { onMount } from 'svelte';
	import { frameSvg, type FrameId } from '@zaur/sprite';

	let {
		frame = 'happy',
		size = 96,
		color = 'currentColor',
		label = '',
		blinks = false
	}: {
		frame?: FrameId;
		/** Rendered width in px; height follows the sprite's aspect ratio. */
		size?: number;
		color?: string;
		/** Accessible label; omit (default) to mark the sprite decorative. */
		label?: string;
		blinks?: boolean;
	} = $props();

	let blinking = $state(false);

	// Pure render — safe to prerender (blinking only starts client-side). scale=5
	// matches the 100×90 brand mark grid; the wrapper scales it down to `size` via CSS.
	const svg = $derived(frameSvg(blinking ? 'blink' : frame, { scale: 5, color }));

	onMount(() => {
		if (!blinks || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const BLINK_MS = 180;
		let alive = true;
		let timer: ReturnType<typeof setTimeout> | undefined;

		const wait = (ms: number) =>
			new Promise<void>((resolve) => {
				timer = setTimeout(resolve, ms);
			});

		const blinkOnce = async () => {
			blinking = true;
			await wait(BLINK_MS);
			blinking = false;
		};

		void (async () => {
			await wait(2000 + Math.random() * 3000);
			while (alive) {
				await blinkOnce();
				if (Math.random() < 0.3) {
					await wait(120);
					await blinkOnce();
				}
				await wait(2500 + Math.random() * 4500);
			}
		})();

		return () => {
			alive = false;
			clearTimeout(timer);
		};
	});
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
