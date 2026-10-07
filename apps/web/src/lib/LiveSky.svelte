<script lang="ts">
	// Dino's node is the one exception to the screenshot strips: it runs the
	// real @nomideusz/zaur-world sky, small and live, keyed to the visitor's
	// own place and weather (Open-Meteo, IP location). Sweeping across it on
	// a mouse previews the day's scenes at the visitor's real sun times;
	// leaving returns to now. The dots do the same by click and keyboard.
	// The engine loads only when the node comes near the viewport, and it
	// pauses whenever the node is off screen.
	import { onMount } from 'svelte';
	import type { WorldHandle, ScenePreset, WeatherConditions } from '@nomideusz/zaur-world';

	let { name }: { name: string } = $props();

	const scenes: { id: ScenePreset | null; label: string }[] = [
		{ id: null, label: 'Now' },
		{ id: 'dawn', label: 'Dawn' },
		{ id: 'noon', label: 'Noon' },
		{ id: 'golden', label: 'Golden hour' },
		{ id: 'dusk', label: 'Dusk' },
		{ id: 'night', label: 'Night' }
	];

	let host = $state<HTMLElement>();
	let canvas = $state<HTMLCanvasElement>();
	let sky: WorldHandle | null = null;
	let scene = $state(0);
	let status = $state<'loading' | 'live' | 'down'>('loading');
	let city = $state<string | null>(null);
	let wx = $state<WeatherConditions | null>(null);
	let describe: ((code: number, isDay: boolean) => string) | null = null;

	const summary = $derived.by(() => {
		if (!wx) return '';
		const temp = `${Math.round(wx.temperatureC)}°`;
		const what = wx.weatherCode != null && describe ? describe(wx.weatherCode, wx.isDay).toLowerCase() : '';
		return what ? `${temp}, ${what}` : temp;
	});

	function show(i: number) {
		if (i === scene) return;
		scene = i;
		sky?.preview(scenes[i].id);
	}

	function scrub(e: PointerEvent) {
		if (e.pointerType !== 'mouse' || !sky) return;
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		show(Math.min(scenes.length - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * scenes.length))));
	}

	onMount(() => {
		if (!host || !canvas) return;
		let mounted = false;
		let cityPoll: ReturnType<typeof setInterval> | undefined;
		const io = new IntersectionObserver(
			async ([entry]) => {
				if (!entry.isIntersecting) {
					sky?.pause();
					return;
				}
				if (mounted) {
					sky?.resume();
					return;
				}
				mounted = true;
				try {
					const zw = await import('@nomideusz/zaur-world');
					describe = zw.describeWeather;
					sky = zw.createWorld(canvas!, {
						gridColor: null,
						atmosphereRoot: null,
						quality: 'auto',
						onConditionsChange: (c) => {
							wx = c;
							status = 'live';
							city = sky?.city() ?? city;
						}
					});
					// The city label can resolve after the first conditions arrive.
					cityPoll = setInterval(() => {
						const c = sky?.city();
						if (c) {
							city = c;
							clearInterval(cityPoll);
						}
					}, 1000);
					setTimeout(() => clearInterval(cityPoll), 30_000);
				} catch {
					status = 'down';
				}
			},
			{ rootMargin: '240px' }
		);
		io.observe(host);
		return () => {
			io.disconnect();
			clearInterval(cityPoll);
			sky?.destroy();
			sky = null;
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions (scrubbing is a pointer-only extra; the scene buttons are the controls) -->
<div class="peek peek--live" bind:this={host} onpointermove={scrub} onpointerleave={() => show(0)}>
	<canvas bind:this={canvas} aria-label="{name}: the live sky over your location right now."></canvas>
	<span class="live-tag">
		<span class="dot" class:dot--off={status !== 'live'}></span>
		{#if status === 'live'}{city ?? 'Your sky'} · {summary}{:else if status === 'down'}The sky didn't load{:else}Reading your sky…{/if}
	</span>
	<div class="scenes" role="group" aria-label="Time of day">
		{#each scenes as s, i (s.label)}
			<button type="button" class:on={i === scene} aria-pressed={i === scene} aria-label={s.label} title={s.label} onclick={() => show(i)}></button>
		{/each}
	</div>
	<span class="peek__badge" aria-live="polite">{scene === 0 ? 'Live' : scenes[scene].label}</span>
</div>
