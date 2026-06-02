<script lang="ts">
	import { onMount } from 'svelte';
	import ZaurSprite from '$lib/components/ui/ZaurSprite.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import type { FrameId } from '@zaur/sprite';

	// ── Constants ─────────────────────────────────────────────────────
	const SCALE = 3;
	const FRAME_MS = 180;
	const SPRITE_W = 20 * SCALE;
	const SPRITE_H = 18 * SCALE;

	// Appearance probability: 30% initial, ramps to 100% over 90 s
	const BASE_CHANCE = 0.3;
	const RAMP_MS = 90_000;
	const CHECK_MS = 3_500;
	const INITIAL_DELAY_MS = 2_000;

	// Vertical shift values (translateY — positive = pushed down = hidden)
	const HIDDEN_SHIFT = SPRITE_H + 14; // fully below visible area
	const SHY_PEEK_SHIFT = 40; // head + upper body visible

	// ── Types ─────────────────────────────────────────────────────────
	interface Step {
		dur: number;
		frame: FrameId | 'walk';
		facing: 'left' | 'right';
		vx: number;
		ys: number;
		ye: number;
	}

	interface ScenarioDef {
		weight: number;
		build: (tw: number) => { x0: number; steps: Step[] };
	}

	// ── Reactive state ────────────────────────────────────────────────
	let trackEl = $state<HTMLDivElement | null>(null);
	let trackWidth = $state(0);
	let appeared = $state(false);
	let scenarioDone = $state(false);
	let frame = $state<FrameId>('idle');
	let face = $state<'left' | 'right'>('right');
	let posX = $state(0);
	let shiftY = $state(HIDDEN_SHIFT);
	let animTick = $state(0);

	const showSprite = $derived(appeared && !scenarioDone);

	// ── Helpers ───────────────────────────────────────────────────────
	function easeInOut(t: number): number {
		return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
	}

	function walkFrame(t: number): FrameId {
		return Math.floor(t / FRAME_MS) % 2 === 0 ? 'walk_a' : 'walk_b';
	}

	// ── Scenarios ─────────────────────────────────────────────────────
	const scenarios: ScenarioDef[] = [
		// 1. Shy Peek — rises from below, blinks twice, sinks back
		{
			weight: 3,
			build(tw) {
				const xp = tw * (0.25 + Math.random() * 0.5);
				const f: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
				return {
					x0: xp,
					steps: [
						{ dur: 1400, frame: 'idle', facing: f, vx: 0, ys: HIDDEN_SHIFT, ye: SHY_PEEK_SHIFT },
						{ dur: 600, frame: 'idle', facing: f, vx: 0, ys: SHY_PEEK_SHIFT, ye: SHY_PEEK_SHIFT },
						{ dur: 180, frame: 'blink', facing: f, vx: 0, ys: SHY_PEEK_SHIFT, ye: SHY_PEEK_SHIFT },
						{ dur: 500, frame: 'idle', facing: f, vx: 0, ys: SHY_PEEK_SHIFT, ye: SHY_PEEK_SHIFT },
						{ dur: 180, frame: 'blink', facing: f, vx: 0, ys: SHY_PEEK_SHIFT, ye: SHY_PEEK_SHIFT },
						{ dur: 700, frame: 'idle', facing: f, vx: 0, ys: SHY_PEEK_SHIFT, ye: SHY_PEEK_SHIFT },
						{ dur: 1200, frame: 'idle', facing: f, vx: 0, ys: SHY_PEEK_SHIFT, ye: HIDDEN_SHIFT }
					]
				};
			}
		},

		// 2. Casual Stroll — walks across, pauses to look up, continues off
		{
			weight: 3,
			build(tw) {
				const left = Math.random() < 0.5;
				const f: 'left' | 'right' = left ? 'right' : 'left';
				const x0 = left ? -SPRITE_W : tw + SPRITE_W;
				const mid = tw * (left ? 0.55 : 0.45);
				const exit = left ? tw + SPRITE_W : -SPRITE_W;
				const spd = 42;
				const vx = left ? spd : -spd;
				return {
					x0,
					steps: [
						{ dur: (Math.abs(mid - x0) / spd) * 1000, frame: 'walk', facing: f, vx, ys: 0, ye: 0 },
						{ dur: 1800, frame: 'look_up', facing: f, vx: 0, ys: 0, ye: 0 },
						{ dur: (Math.abs(exit - mid) / spd) * 1000, frame: 'walk', facing: f, vx, ys: 0, ye: 0 }
					]
				};
			}
		},

		// 3. Startled Retreat — walks in, spots user, surprise face, runs back
		{
			weight: 2,
			build(tw) {
				const left = Math.random() < 0.5;
				const f: 'left' | 'right' = left ? 'right' : 'left';
				const rf: 'left' | 'right' = left ? 'left' : 'right';
				const x0 = left ? -SPRITE_W : tw + SPRITE_W;
				const stop = tw * (left ? 0.4 : 0.6);
				const spd = 42;
				const run = 95;
				return {
					x0,
					steps: [
						{
							dur: (Math.abs(stop - x0) / spd) * 1000,
							frame: 'walk',
							facing: f,
							vx: left ? spd : -spd,
							ys: 0,
							ye: 0
						},
						{ dur: 900, frame: 'surprise', facing: f, vx: 0, ys: 0, ye: 0 },
						{
							dur: (Math.abs(stop - x0) / run) * 1000,
							frame: 'walk',
							facing: rf,
							vx: left ? -run : run,
							ys: 0,
							ye: 0
						}
					]
				};
			}
		},

		// 4. Sleepy Wander — walks in slowly, naps, wakes up, walks off
		{
			weight: 1,
			build(tw) {
				const left = Math.random() < 0.5;
				const f: 'left' | 'right' = left ? 'right' : 'left';
				const x0 = left ? -SPRITE_W : tw + SPRITE_W;
				const nap = tw * 0.5;
				const exit = left ? tw + SPRITE_W : -SPRITE_W;
				const spd = 30;
				const vx = left ? spd : -spd;
				return {
					x0,
					steps: [
						{ dur: (Math.abs(nap - x0) / spd) * 1000, frame: 'walk', facing: f, vx, ys: 0, ye: 0 },
						{ dur: 3000, frame: 'sleep', facing: f, vx: 0, ys: 0, ye: 0 },
						{ dur: 1000, frame: 'look_up', facing: f, vx: 0, ys: 0, ye: 0 },
						{ dur: (Math.abs(exit - nap) / spd) * 1000, frame: 'walk', facing: f, vx, ys: 0, ye: 0 }
					]
				};
			}
		},

		// 5. Happy Discovery — walks to center, celebrates, walks off
		{
			weight: 2,
			build(tw) {
				const left = Math.random() < 0.5;
				const f: 'left' | 'right' = left ? 'right' : 'left';
				const x0 = left ? -SPRITE_W : tw + SPRITE_W;
				const center = tw * 0.5;
				const exit = left ? tw + SPRITE_W : -SPRITE_W;
				const spd = 42;
				const vx = left ? spd : -spd;
				return {
					x0,
					steps: [
						{
							dur: (Math.abs(center - x0) / spd) * 1000,
							frame: 'walk',
							facing: f,
							vx,
							ys: 0,
							ye: 0
						},
						{ dur: 800, frame: 'happy', facing: f, vx: 0, ys: 0, ye: 0 },
						{ dur: 900, frame: 'cheer', facing: f, vx: 0, ys: 0, ye: 0 },
						{
							dur: (Math.abs(exit - center) / spd) * 1000,
							frame: 'walk',
							facing: f,
							vx,
							ys: 0,
							ye: 0
						}
					]
				};
			}
		}
	];

	function pickScenario(): ScenarioDef {
		const total = scenarios.reduce((sum, s) => sum + s.weight, 0);
		let r = Math.random() * total;
		for (const s of scenarios) {
			r -= s.weight;
			if (r <= 0) return s;
		}
		return scenarios[0];
	}

	// ── Lifecycle ─────────────────────────────────────────────────────
	onMount(() => {
		const track = trackEl;
		if (!track) return;

		let rafId = 0;
		let timerId: ReturnType<typeof setInterval> | undefined;
		let delayId: ReturnType<typeof setTimeout> | undefined;
		let alive = true;

		const observer = new ResizeObserver(([e]) => {
			trackWidth = e.contentRect.width;
		});
		observer.observe(track);
		trackWidth = track.clientWidth;

		const mountedAt = performance.now();

		// ── reduceMotion: static idle sprite, same probability ────────
		if (settings.reduceMotion) {
			const check = () => {
				if (!alive || appeared) return;
				const elapsed = performance.now() - mountedAt;
				const chance = Math.min(1, BASE_CHANCE + (elapsed / RAMP_MS) * (1 - BASE_CHANCE));
				if (Math.random() < chance) {
					clearInterval(timerId);
					appeared = true;
					frame = 'idle';
					posX = (trackWidth || track.clientWidth) / 2;
					shiftY = 0;
				}
			};
			delayId = setTimeout(() => {
				check();
				if (!appeared) timerId = setInterval(check, CHECK_MS);
			}, INITIAL_DELAY_MS);
			return () => {
				alive = false;
				clearTimeout(delayId);
				clearInterval(timerId);
				observer.disconnect();
			};
		}

		// ── Animated scenarios ────────────────────────────────────────
		function tryAppear() {
			if (!alive || appeared) return;
			const tw = trackWidth || track!.clientWidth;
			if (tw <= 0) return;
			const elapsed = performance.now() - mountedAt;
			const chance = Math.min(1, BASE_CHANCE + (elapsed / RAMP_MS) * (1 - BASE_CHANCE));
			if (Math.random() < chance) {
				clearInterval(timerId);
				runScenario(tw);
			}
		}

		delayId = setTimeout(() => {
			tryAppear();
			if (!appeared) {
				timerId = setInterval(tryAppear, CHECK_MS);
			}
		}, INITIAL_DELAY_MS);

		function runScenario(tw: number) {
			const scenario = pickScenario();
			const { x0, steps } = scenario.build(tw);

			appeared = true;
			posX = x0;
			animTick = 0;

			let stepIdx = 0;
			let stepStart = performance.now();
			let lastT = stepStart;

			// Init from first step
			const first = steps[0];
			if (first) {
				shiftY = first.ys;
				face = first.facing;
				frame = first.frame === 'walk' ? 'walk_a' : first.frame;
			}

			const loop = (now: number) => {
				if (!alive) return;

				const dt = Math.min(now - lastT, 50);
				lastT = now;
				animTick += dt;

				const step = steps[stepIdx];
				if (!step) {
					scenarioDone = true;
					return;
				}

				const elapsed = now - stepStart;
				const t = Math.min(1, elapsed / step.dur);
				const te = easeInOut(t);

				posX += step.vx * (dt / 1000);
				shiftY = step.ys + (step.ye - step.ys) * te;
				face = step.facing;
				frame = step.frame === 'walk' ? walkFrame(animTick) : step.frame;

				if (elapsed >= step.dur) {
					shiftY = step.ye;
					stepIdx++;
					stepStart = now;
					if (stepIdx >= steps.length) {
						scenarioDone = true;
						return;
					}
				}

				rafId = requestAnimationFrame(loop);
			};

			rafId = requestAnimationFrame(loop);
		}

		return () => {
			alive = false;
			cancelAnimationFrame(rafId);
			clearTimeout(delayId);
			clearInterval(timerId);
			observer.disconnect();
		};
	});
</script>

<div
	bind:this={trackEl}
	class="pointer-events-none relative hidden h-20 shrink-0 overflow-hidden md:block"
	aria-hidden="true"
>
	<div class="absolute inset-x-0 bottom-3 border-t border-border/35"></div>
	{#if showSprite}
		<div
			class="absolute bottom-3 will-change-transform"
			style:left="{posX}px"
			style:transform="translateX(-50%) translateY({shiftY}px)"
		>
			<ZaurSprite id={frame} facing={face} scale={SCALE} class="text-fg-subtle/70" />
		</div>
	{/if}
</div>
