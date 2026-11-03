<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '#lib/i18n';
	import type { WorldHandle } from '@nomideusz/zaur-world';

	// The first thing on the page to play with: tonight's real sky over Kraków in
	// the poster's column, a slider through its 24 hours, its weather looks, and
	// Radio Bartek under it. The DJ talks about Kraków's weather, so it stays there.
	let { href }: { href: string } = $props();

	const api = $derived(new URL('/api/now-playing', href).href);
	const stream = $derived(new URL('/stream.mp3', href).href);
	const geo = { lat: 50.0614, lon: 19.9366, city: 'Kraków' };
	const looks = ['storm', 'snow', 'fog'] as const;
	type Look = (typeof looks)[number];

	let canvas: HTMLCanvasElement;
	let audio: HTMLAudioElement;
	let sky: WorldHandle | undefined;
	let status = $state<'idle' | 'loading' | 'playing' | 'offline'>('idle');
	let now = $state<{ title: string; artist: string } | null>(null);
	let dj = $state('');
	let hour = $state(12);
	let live = $state(true);
	let look = $state<Look | null>(null);
	let touring = $state(false);

	const label = $derived(`${String(Math.floor(hour) % 24).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`);

	/** The moment `h` hours into today at the sky's own place, whatever the visitor's clock says. */
	function at(h: number) {
		const offset = sky?.utcOffsetSeconds() ?? -new Date().getTimezoneOffset() * 60;
		const day = 86_400;
		const midnight = Math.floor((Date.now() / 1000 + offset) / day) * day - offset;
		return new Date((midnight + h * 3600) * 1000);
	}
	let moment = new Date();
	function scrubTo(h: number) {
		hour = h;
		moment = at(h);
		if (live) {
			live = false;
			sky?.setTime(() => moment);
		}
		sky?.setForecastHour(Math.floor(h) % 24);
	}
	const toLive = () => {
		stopTour();
		live = true;
		look = null;
		sky?.setTime(undefined);
		sky?.setForecastHour(null);
		sky?.setWeatherPreview(null);
		if (sky) hour = sky.localHour();
	};
	function pickLook(l: Look) {
		look = look === l ? null : l;
		sky?.setWeatherPreview(look);
	}

	// A day in thirty seconds, from wherever the slider stands.
	let tourFrame = 0;
	function stopTour() {
		cancelAnimationFrame(tourFrame);
		touring = false;
	}
	function tour() {
		if (touring) return stopTour();
		touring = true;
		let last = performance.now();
		let h = hour;
		const step = (t: number) => {
			h = (h + ((t - last) / 30_000) * 24) % 24;
			last = t;
			scrubTo(h);
			tourFrame = requestAnimationFrame(step);
		};
		tourFrame = requestAnimationFrame(step);
	}

	async function refresh() {
		try {
			const j = await (await fetch(api)).json();
			now = j.nowPlaying ?? null;
			dj = j.dj?.name ?? '';
			if (j.streamOnline === false && status === 'idle') status = 'offline';
		} catch {
			now = null;
		}
	}

	function toggle() {
		if (status === 'playing' || status === 'loading') {
			// A live stream can't resume where it paused: drop it, reconnect on play.
			audio.pause();
			audio.removeAttribute('src');
			audio.load();
			status = 'idle';
			return;
		}
		audio.src = stream;
		status = 'loading';
		audio.play().catch(() => (status = 'offline'));
	}

	onMount(() => {
		let timer: ReturnType<typeof setInterval> | undefined;
		let clock: ReturnType<typeof setInterval> | undefined;
		let gone = false;
		hour = new Date().getHours() + new Date().getMinutes() / 60;
		// The sky (and its ~25 kB) loads after the page has painted, and stops, with
		// the now-playing line, when the band leaves the screen.
		const io = new IntersectionObserver(
			async ([e]) => {
				if (!e.isIntersecting) {
					sky?.pause();
					stopTour();
					clearInterval(timer);
					timer = undefined;
					return;
				}
				if (sky) sky.resume();
				else {
					const { createWorld } = await import('@nomideusz/zaur-world');
					if (gone) return;
					sky = createWorld(canvas, { geo, cache: false, atmosphereRoot: null, gridColor: null, quality: 'auto' });
					clock = setInterval(() => {
						if (live && sky) hour = sky.localHour();
					}, 30_000);
				}
				if (!timer) {
					refresh();
					timer = setInterval(refresh, 20_000);
				}
			},
			{ rootMargin: '20% 0px' }
		);
		io.observe(canvas);
		return () => {
			gone = true;
			io.disconnect();
			clearInterval(timer);
			clearInterval(clock);
			stopTour();
			sky?.destroy();
		};
	});
</script>

<section class="world" id="sky" aria-labelledby="sky-h">
	<div class="window"><canvas bind:this={canvas} aria-hidden="true"></canvas></div>
	<div class="board">
		<div class="name">
			<h2 id="sky-h">{t('sky.title', { city: geo.city })}</h2>
			<a href="#pkg-zaur-world">zaur-world</a>
		</div>

		<div class="clock">
			<output class="time" for="sky-hour">{label}</output>
			<label class="scrub">
				<span class="sr">{t('sky.scrub')}</span>
				<input id="sky-hour" type="range" min="0" max="23.99" step="0.05" value={hour} oninput={(e) => { stopTour(); scrubTo(+e.currentTarget.value); }} />
			</label>
		</div>

		<div class="seg" role="group" aria-label={t('sky.controls')}>
			<button type="button" aria-pressed={live && !look} onclick={toLive}>{t('sky.now')}</button>
			<button type="button" aria-pressed={touring} onclick={tour}>{t(touring ? 'sky.stop' : 'sky.tour')}</button>
			{#each looks as l (l)}<button type="button" aria-pressed={look === l} onclick={() => pickLook(l)}>{t(`sky.look.${l}`)}</button>{/each}
		</div>

		<div class="tuner">
			<button type="button" class="listen" aria-pressed={status === 'playing'} onclick={toggle}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					{#if status === 'playing' || status === 'loading'}<path d="M7 5h3v14H7zM14 5h3v14h-3z" />{:else}<path d="M8 5v14l11-7z" />{/if}
				</svg>
				<span>{t(status === 'playing' ? 'radio.pause' : status === 'loading' ? 'radio.tuning' : 'radio.listen')}</span>
			</button>
			<p aria-live="polite">
				{#if status === 'offline'}{t('radio.offline')}
				{:else if now}<b>{now.title}</b> {now.artist}{#if dj}<span>{t('radio.dj', { name: dj })}</span>{/if}
				{:else}{t('radio.idle')}{/if}
			</p>
		</div>
	</div>
	<audio
		bind:this={audio}
		preload="none"
		onplaying={() => (status = 'playing')}
		onwaiting={() => status === 'playing' && (status = 'loading')}
		onerror={() => audio.getAttribute('src') && (status = 'offline')}
	></audio>
</section>

<style>
	/* The rest of the poster's column: the window takes what the board leaves. */
	.world {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		border-top: var(--rule) solid var(--ink);
		background: var(--ink);
		color: var(--paper);
	}
	/* A window on the real sky, the poster's one picture that isn't flat. Until it
	   loads the column's lilac stands in it, so nothing flashes dark. */
	.window {
		position: relative;
		flex: 1;
		min-height: calc(9 * var(--u));
		background: var(--lilac);
	}
	canvas {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
	}
	.board {
		display: grid;
		gap: calc(0.6 * var(--u));
		padding: calc(0.9 * var(--u)) calc(1.6 * var(--u)) calc(1.1 * var(--u));
		font-size: max(13px, calc(0.95 * var(--u)));
	}
	.name {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}
	h2 {
		font-weight: 700;
		font-size: max(1rem, calc(1.35 * var(--u)));
		letter-spacing: -0.02em;
	}
	.clock {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		gap: calc(1.2 * var(--u));
		align-items: center;
	}
	.time {
		min-width: 3.1em;
		font-weight: 800;
		font-size: max(2rem, calc(3.2 * var(--u)));
		line-height: 1;
		letter-spacing: -0.04em;
		font-variant-numeric: tabular-nums;
	}
	.scrub {
		display: grid;
	}
	/* The day as one long square-handled rule. */
	input[type='range'] {
		width: 100%;
		height: 2.25rem;
		margin: 0;
		background: none;
		cursor: ew-resize;
		appearance: none;
		-webkit-appearance: none;
	}
	input[type='range']::-webkit-slider-runnable-track {
		height: 4px;
		background: var(--paper);
	}
	input[type='range']::-moz-range-track {
		height: 4px;
		background: var(--paper);
	}
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 1rem;
		height: 2.25rem;
		margin-top: calc(2px - 1.125rem);
		border: 0;
		border-radius: 0;
		background: var(--orange);
	}
	input[type='range']::-moz-range-thumb {
		width: 1rem;
		height: 2.25rem;
		border: 0;
		border-radius: 0;
		background: var(--orange);
	}
	input[type='range']:focus-visible {
		outline-color: var(--orange);
	}
	.seg {
		display: flex;
		flex-wrap: wrap;
		gap: calc(0.35 * var(--u));
		font-weight: 700;
	}
	.seg button {
		min-height: max(1.75rem, calc(2.2 * var(--u)));
		padding: 0 calc(0.55 * var(--u));
		border: var(--rule) solid var(--paper);
		border-radius: 3px;
		background: none;
		color: var(--paper);
		font: inherit;
		cursor: pointer;
	}
	.seg button:hover:not([aria-pressed='true']) {
		border-color: var(--orange);
		color: var(--orange);
	}
	.seg button[aria-pressed='true'] {
		background: var(--paper);
		color: var(--ink);
	}
	.seg button:focus-visible,
	.listen:focus-visible,
	a:focus-visible {
		outline-color: var(--orange);
	}
	.tuner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}
	.listen {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex: none;
		min-height: max(1.75rem, calc(2.2 * var(--u)));
		padding: 0 0.75rem 0 0.55rem;
		border: 0;
		background: var(--orange);
		color: var(--ink);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.listen:hover {
		background: var(--paper);
	}
	svg {
		width: 1.1rem;
		height: 1.1rem;
		fill: currentColor;
	}
	/* One line, whatever is on air, so the column never changes height. */
	.tuner p {
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.tuner p span {
		color: color-mix(in srgb, var(--paper) 70%, transparent);
	}
	@media (max-width: 900px) {
		.world {
			border-top: 0;
		}
		.window {
			flex: none;
			height: max(13rem, 30svh);
		}
		.board {
			gap: 0.6rem;
			padding: 0.9rem 1rem 1.1rem;
			font-size: 0.875rem;
		}
		.clock {
			gap: 0.75rem;
		}
		.seg {
			gap: 0.3rem;
		}
		.seg button {
			padding: 0 0.5rem;
		}
	}
	@media (pointer: coarse) {
		.seg button,
		.listen {
			min-height: 2.75rem;
		}
		.seg button {
			min-width: 2.75rem;
		}
		input[type='range'] {
			height: 2.75rem;
		}
		input[type='range']::-webkit-slider-thumb {
			height: 2.75rem;
			margin-top: calc(2px - 1.375rem);
		}
		input[type='range']::-moz-range-thumb {
			height: 2.75rem;
		}
	}
</style>
