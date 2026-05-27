<script lang="ts">
	import { onMount } from 'svelte';
	import ZaurSprite from '$lib/components/ui/ZaurSprite.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import type { FrameId } from '@zaur/sprite';

	const SCALE = 3;
	const SPEED = 42;
	const FRAME_MS = 180;

	let trackEl = $state<HTMLDivElement | null>(null);
	let x = $state(0);
	let direction = $state<1 | -1>(1);
	let frame = $state<FrameId>('walk_a');
	let trackWidth = $state(0);

	const dinoWidth = 20 * SCALE;
	const facing = $derived(direction === 1 ? 'right' : 'left');
	const spriteId = $derived(settings.reduceMotion ? 'idle' : frame);
	const displayX = $derived(settings.reduceMotion ? trackWidth / 2 || dinoWidth / 2 : x);

	onMount(() => {
		const track = trackEl;
		if (!track) return;

		const observer = new ResizeObserver(([entry]) => {
			trackWidth = entry.contentRect.width;
			x = Math.min(Math.max(x, dinoWidth / 2), Math.max(dinoWidth / 2, trackWidth - dinoWidth / 2));
		});
		observer.observe(track);
		trackWidth = track.clientWidth;
		x = dinoWidth / 2;

		let raf = 0;
		let last = performance.now();
		let animTick = 0;

		const tick = (now: number) => {
			const dt = Math.min(now - last, 48);
			last = now;

			if (!settings.reduceMotion && trackWidth > 0) {
				const minX = dinoWidth / 2;
				const maxX = trackWidth - dinoWidth / 2;

				x += direction * ((SPEED * dt) / 1000);
				if (x <= minX) {
					x = minX;
					direction = 1;
				} else if (x >= maxX) {
					x = maxX;
					direction = -1;
				}

				animTick += dt;
				frame = Math.floor(animTick / FRAME_MS) % 2 === 0 ? 'walk_a' : 'walk_b';
			}

			raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
		};
	});
</script>

<div
	bind:this={trackEl}
	class="pointer-events-none relative hidden h-20 shrink-0 overflow-hidden md:block"
	aria-hidden="true"
>
	<div class="absolute inset-x-6 bottom-3 border-t border-border/35"></div>
	<div
		class="absolute bottom-3 will-change-transform"
		style:left="{displayX}px"
		style:transform="translateX(-50%)"
	>
		<ZaurSprite id={spriteId} {facing} scale={SCALE} class="text-fg-subtle/70" />
	</div>
</div>
