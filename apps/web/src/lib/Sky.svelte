<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '#lib/i18n';
	import type { WorldHandle } from '@nomideusz/zaur-world';

	// The package at full width: tonight's real sky over Kraków, a slider through
	// its 24 hours, its weather looks, and Radio Bartek played under it. The DJ
	// talks about Kraków's weather, so that stays the default place; another sky
	// only comes from the visitor's own click (and the browser's permission).
	let { href, locale, version, npm, used }: { href: string; locale: string; version: string; npm: string; used: string } = $props();

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
	let city = $state(geo.city);
	let locating = $state(false);
	let noLocation = $state(false);
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

	async function mine() {
		locating = true;
		noLocation = false;
		try {
			const place = await sky?.relocate();
			if (place) city = sky?.city() ?? `${place.lat.toFixed(1)}, ${place.lon.toFixed(1)}`;
			else noLocation = true;
		} catch {
			noLocation = true;
		} finally {
			locating = false;
		}
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
		// The sky (and its ~25 kB) loads only when the band nears view, and stops when it leaves.
		const io = new IntersectionObserver(
			async ([e]) => {
				if (!e.isIntersecting) {
					sky?.pause();
					stopTour();
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

<section class="world" id="pkg-zaur-world" aria-labelledby="sky-h">
	<canvas bind:this={canvas} aria-hidden="true"></canvas>
	<div class="board">
		<div class="name">
			<h3 id="sky-h">{t('sky.title', { city })}</h3>
			<p class="ver"><a href={npm}>zaur-world</a> {version}</p>
		</div>
		<p class="what">{t('sky.lede')}</p>

		<div class="clock">
			<output class="time" for="sky-hour">{label}</output>
			<label class="scrub">
				<span class="sr">{t('sky.scrub')}</span>
				<input id="sky-hour" type="range" min="0" max="23.99" step="0.05" value={hour} oninput={(e) => { stopTour(); scrubTo(+e.currentTarget.value); }} />
				<span class="hours" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></span>
			</label>
		</div>

		<div class="controls">
			<div class="seg" role="group" aria-label={t('sky.controls')}>
				<button type="button" aria-pressed={live && !look} onclick={toLive}>{t('sky.now')}</button>
				<button type="button" aria-pressed={touring} onclick={tour}>{t(touring ? 'sky.stop' : 'sky.tour')}</button>
				{#each looks as l (l)}<button type="button" aria-pressed={look === l} onclick={() => pickLook(l)}>{t(`sky.look.${l}`)}</button>{/each}
				<button type="button" disabled={locating} onclick={mine}>{t(locating ? 'sky.locating' : 'sky.mine')}</button>
			</div>
			{#if noLocation}<p class="note" role="status">{t('sky.noLocation')}</p>{/if}
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
		<p class="foot">{t('sky.radio')} {#if used}<span>{used}</span>{/if}</p>
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
	.world {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		border-bottom: var(--rule) solid var(--ink);
		background: var(--ink);
		color: var(--paper);
		scroll-margin-top: 3.66vw;
	}
	/* A window on the real sky, the poster's one picture that isn't flat. */
	canvas {
		display: block;
		width: 100%;
		height: min(58vh, 42vw);
		min-height: 18rem;
	}
	.board {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
		gap: 0.75rem 1.39vw;
		padding: 1.1vw 1.39vw 1.2vw;
		border-top: var(--rule) solid var(--ink);
	}
	h3 {
		font-weight: 800;
		font-size: max(2rem, 3.6vw);
		line-height: 1.05;
		letter-spacing: -0.035em;
	}
	.ver {
		margin-top: 0.2rem;
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
	}
	.what {
		max-width: 62ch;
		align-self: end;
	}
	.clock {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		gap: 1.39vw;
		align-items: center;
	}
	.time {
		min-width: 3.1em;
		font-weight: 800;
		font-size: max(2.5rem, 5.4vw);
		line-height: 1;
		letter-spacing: -0.04em;
		font-variant-numeric: tabular-nums;
	}
	.scrub {
		display: grid;
		gap: 0.2rem;
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
	.hours {
		display: flex;
		justify-content: space-between;
		color: color-mix(in srgb, var(--paper) 70%, transparent);
		font-size: 0.8125rem;
		font-variant-numeric: tabular-nums;
	}
	.controls {
		min-width: 0;
	}
	.seg {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		font-size: 0.875rem;
		font-weight: 700;
	}
	.seg button {
		height: 2.25rem;
		padding: 0 0.7rem;
		border: var(--rule) solid var(--paper);
		border-radius: 3px;
		background: none;
		color: var(--paper);
		font: inherit;
		cursor: pointer;
	}
	.seg button:hover:not(:disabled, [aria-pressed='true']) {
		border-color: var(--orange);
		color: var(--orange);
	}
	.seg button[aria-pressed='true'] {
		border-color: var(--paper);
		background: var(--paper);
		color: var(--ink);
	}
	.seg button:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.seg button:focus-visible,
	.listen:focus-visible,
	a:focus-visible {
		outline-color: var(--orange);
	}
	.note {
		margin-top: 0.4rem;
		font-size: 0.875rem;
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
		height: 2.25rem;
		padding: 0 0.75rem 0 0.55rem;
		border: 0;
		background: var(--orange);
		color: var(--ink);
		font: inherit;
		font-weight: 700;
		font-size: 0.875rem;
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
	.tuner p {
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-size: 0.875rem;
	}
	.tuner p span,
	.foot span {
		color: color-mix(in srgb, var(--paper) 70%, transparent);
	}
	.foot {
		grid-column: 1 / -1;
		max-width: 90ch;
		font-size: 0.875rem;
	}
	@media (max-width: 900px) {
		canvas {
			height: 62vh;
		}
		.board {
			grid-template-columns: minmax(0, 1fr);
			padding: 1rem;
		}
		.clock {
			gap: 0.75rem;
		}
		.tuner {
			flex-wrap: wrap;
		}
		.tuner p {
			white-space: normal;
		}
	}
	@media (pointer: coarse) {
		.seg button,
		.listen {
			height: 2.75rem;
		}
		.seg button {
			min-width: 2.75rem;
		}
	}
</style>
