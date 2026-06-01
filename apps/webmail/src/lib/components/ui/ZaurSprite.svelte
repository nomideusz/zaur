<script lang="ts">
	import { onMount } from 'svelte';
	import { frameSvg, type FrameId } from '@zaur/sprite';
	import { settings } from '$lib/stores/settings.svelte';

	let {
		id = 'idle',
		color = 'currentColor',
		scale = 1,
		facing = 'right',
		blinks = false,
		class: className = '',
		...restProps
	}: {
		id?: FrameId;
		color?: string;
		scale?: number;
		facing?: 'left' | 'right';
		blinks?: boolean;
		class?: string;
		[key: string]: any;
	} = $props();

	let blinking = $state(false);
	const frameId = $derived(blinking ? 'blink' : id);
	const svgString = $derived(frameSvg(frameId, { color, scale, facing }));

	onMount(() => {
		if (!blinks || settings.reduceMotion) return;

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

<div class="inline-flex shrink-0 {className}" {...restProps}>
	{@html svgString}
</div>
