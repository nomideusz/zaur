<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '#lib/i18n';
	import type { WorldHandle } from '@nomideusz/zaur-world';

	// Radio Bartek, live: the station's own sky drawn by zaur-world, and its
	// stream played right here. Both endpoints allow cross-origin requests.
	let { href }: { href: string } = $props();
	const api = $derived(new URL('/api/now-playing', href).href);
	const stream = $derived(new URL('/stream.mp3', href).href);
	// Kraków: the city whose weather the DJ talks about on air.
	const geo = { lat: 50.0614, lon: 19.9366, city: 'Kraków' };

	let canvas: HTMLCanvasElement;
	let audio: HTMLAudioElement;
	let status = $state<'idle' | 'loading' | 'playing' | 'offline'>('idle');
	let now = $state<{ title: string; artist: string } | null>(null);
	let dj = $state('');

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
		let sky: WorldHandle | undefined;
		let timer: ReturnType<typeof setInterval> | undefined;
		let gone = false;
		// The sky (and its ~25 kB) loads only when the card scrolls into view.
		const io = new IntersectionObserver(async ([e]) => {
			if (!e.isIntersecting) {
				sky?.pause();
				return;
			}
			if (sky) sky.resume();
			else {
				const { createWorld } = await import('@nomideusz/zaur-world');
				if (gone) return;
				sky = createWorld(canvas, { geo, cache: false, atmosphereRoot: null, gridColor: null, quality: 'auto' });
			}
			if (!timer) {
				refresh();
				timer = setInterval(refresh, 20_000);
			}
		});
		io.observe(canvas);
		return () => {
			gone = true;
			io.disconnect();
			clearInterval(timer);
			sky?.destroy();
		};
	});
</script>

<div class="radio">
	<canvas bind:this={canvas} aria-hidden="true"></canvas>
	<div class="tuner">
		<button type="button" aria-pressed={status === 'playing'} onclick={toggle}>
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
	<audio
		bind:this={audio}
		preload="none"
		onplaying={() => (status = 'playing')}
		onwaiting={() => status === 'playing' && (status = 'loading')}
		onerror={() => audio.getAttribute('src') && (status = 'offline')}
	></audio>
</div>

<style>
	.radio {
		position: relative;
		aspect-ratio: 16 / 10;
		background: var(--ink);
		border-bottom: var(--rule) solid var(--ink);
		overflow: hidden;
	}
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
	.tuner {
		position: absolute;
		inset: auto 0 0;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem;
		background: var(--ink);
		color: var(--paper);
	}
	button {
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
		cursor: pointer;
	}
	button:hover {
		background: var(--orange-lit);
	}
	button:focus-visible {
		outline-color: var(--paper);
	}
	svg {
		width: 1.1rem;
		height: 1.1rem;
		fill: currentColor;
	}
	p {
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-size: 0.875rem;
	}
	p span {
		color: color-mix(in srgb, var(--paper) 65%, transparent);
	}
</style>
