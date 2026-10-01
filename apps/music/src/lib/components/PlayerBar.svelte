<script lang="ts">
	import { formatTime, isStarred, player, toggleStar, wide } from '#lib/player.svelte';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';

	/**
	 * The mini player along the bottom; tapping the song opens Now playing. On a
	 * computer it is the player itself: the song on the left, the transport over
	 * the seek bar in the middle, the volume and the queue on the right.
	 */
	const song = $derived(player.current);
	const progress = $derived(player.duration ? (player.time / player.duration) * 100 : 0);
	// While the thumb is held the slider shows where it is; the audio seeks once, on release
	// (`change` alone is not enough: a touch does not always fire it).
	let drag = $state<number>();
	const shown = $derived(drag ?? player.time);
	function release() {
		if (drag !== undefined) player.seek(drag);
		drag = undefined;
	}
	// On a phone the bar is swiped: up for Now playing, sideways for the next or the last song.
	let start: { x: number; y: number } | undefined;
	function touch(event: TouchEvent) {
		const at = event.touches[0];
		start = innerWidth < 768 && !(event.target as Element).closest('.transport') ? { x: at.clientX, y: at.clientY } : undefined;
	}
	function swipe(event: TouchEvent) {
		if (!start) return;
		const at = event.changedTouches[0];
		const [dx, dy] = [at.clientX - start.x, at.clientY - start.y];
		start = undefined;
		if (dy < -40 && -dy > Math.abs(dx)) player.open = true;
		else if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
			if (dx < 0) player.next();
			else player.previous();
		}
	}
	const repeatLabel = $derived(`Repeat: ${{ off: 'off', all: 'all', one: 'this song' }[player.repeat]}`);
	// The slider at zero is as silent as muted: the button shows, says and undoes both.
	const silent = $derived(player.muted || !player.volume);
</script>

{#if song}
	<div class="bar" role="region" aria-label="Player" ontouchstart={touch} ontouchend={swipe}>
		<span class="line" style="width: {progress}%"></span>
		<div class="left">
		<button
			class="now"
			type="button"
			onclick={() => player.show()}
			aria-label="Now playing: {song.title}{song.artist ? ` — ${song.artist}` : ''}. Open player"
		>
			<Cover id={song.coverArt} size={96} class="w-11 shrink-0 !rounded-md" />
			<span class="text">
				<span class="title">{song.title}</span>
				<span class="meta">{song.artist ?? ''}</span>
			</span>
		</button>
		<button
			class="z-icon-btn !size-9 shrink-0 wide"
			class:starred={isStarred(song)}
			type="button"
			aria-label={isStarred(song) ? 'Remove from favourites' : 'Add to favourites'}
			aria-pressed={isStarred(song)}
			onclick={() => toggleStar(song)}
		>
			<Icon name={isStarred(song) ? 'heart-filled' : 'heart'} />
		</button>
		</div>

		<div class="center">

		<div class="transport">
			<button
				class="z-icon-btn !size-9 wide"
				class:on={player.shuffling}
				type="button"
				aria-label="Shuffle"
				aria-pressed={player.shuffling}
				title="Shuffle what's next"
				onclick={() => player.toggleShuffle()}
			>
				<Icon name="shuffle" />
			</button>
			<button class="z-icon-btn !size-9 wide" type="button" aria-label="Previous" onclick={() => player.previous()}>
				<Icon name="prev" />
			</button>
			<button
				class="play"
				class:waiting={player.waiting}
				type="button"
				aria-label={player.playing ? 'Pause' : 'Play'}
				aria-busy={player.waiting}
				onclick={() => player.toggle()}
			>
				<Icon name={player.playing ? 'pause' : 'play'} class="size-4" />
			</button>
			<button
				class="z-icon-btn !size-9 pointer-coarse:!size-11"
				type="button"
				aria-label="Next"
				disabled={!player.hasNext}
				onclick={() => player.next()}
			>
				<Icon name="next" />
			</button>
			<button
				class="z-icon-btn !size-9 wide"
				class:on={player.repeat !== 'off'}
				type="button"
				aria-label={repeatLabel}
				title={repeatLabel}
				onclick={() => player.cycleRepeat()}
			>
				<Icon name={player.repeat === 'one' ? 'repeat-one' : 'repeat'} />
			</button>
		</div>

		<div class="scrub wide">
			<span class="z-mono">{formatTime(shown)}</span>
			<input
				type="range"
				min="0"
				max={player.duration || 0}
				step="1"
				value={shown}
				aria-label="Position"
				aria-valuetext="{formatTime(shown)} of {formatTime(player.duration)}"
				oninput={(event) => (drag = Number(event.currentTarget.value))}
				onchange={release}
				onpointerup={release}
				onpointercancel={release}
			/>
			<span class="z-mono">{formatTime(player.duration)}</span>
		</div>
		</div>

		<div class="right">

		<!-- Loudness is the hardware keys' job on a phone (and iOS ignores it), so this is for a mouse. -->
		<div class="vol wide">
			<button
				class="z-icon-btn !size-9"
				type="button"
				aria-label="Mute"
				aria-pressed={silent}
				title={silent ? 'Unmute' : 'Mute'}
				onclick={() => player.toggleMute()}
			>
				<Icon name={silent ? 'mute' : 'volume'} />
			</button>
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={player.muted ? 0 : player.volume}
				aria-label="Volume"
				aria-valuetext="{Math.round((player.muted ? 0 : player.volume) * 100)}%"
				oninput={(event) => player.setVolume(Number(event.currentTarget.value))}
			/>
		</div>

		<button
			class="z-icon-btn !size-9 wide"
			class:on={wide.current && player.panel}
			type="button"
			aria-label="Queue"
			title="Queue"
			onclick={() => player.show()}
		>
			<Icon name="queue" />
		</button>
		</div>
	</div>
{/if}

<style>
	.bar {
		position: relative;
		display: flex;
		align-items: center;
		gap: 12px;
		height: 64px;
		padding: 0 12px;
		border-top: 1px solid var(--z-line);
		background: var(--z-surface);
	}
	.line {
		position: absolute;
		top: -1px;
		left: 0;
		height: 2px;
		background: var(--z-accent);
	}
	.now {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 10px;
		min-width: 0;
		padding: 0;
		border: 0;
		background: none;
		text-align: left;
		cursor: pointer;
	}
	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.title,
	.meta {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.title {
		color: var(--z-ink);
		font-weight: 600;
	}
	.meta {
		color: var(--z-soft);
		font-size: 12.5px;
	}
	.transport {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.play {
		position: relative;
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border: 1px solid var(--z-accent-edge);
		border-radius: 999px;
		background: var(--z-accent);
		color: var(--z-accent-fg);
		box-shadow: var(--z-shadow-primary);
		cursor: pointer;
	}
	/* Loading or buffering: a ring turns around the button (after a beat, so a quick start shows nothing). */
	.play::after {
		content: '';
		position: absolute;
		inset: -5px;
		border: 2px solid transparent;
		border-top-color: var(--z-accent);
		border-radius: inherit;
		opacity: 0;
	}
	.play.waiting::after {
		opacity: 1;
		transition: opacity 0.2s 0.3s;
		animation: turn 0.8s linear infinite;
	}
	@keyframes turn {
		to {
			transform: rotate(360deg);
		}
	}
	/* A toggle that is on: the accent, and a dot so it is not told by colour alone. */
	.on {
		position: relative;
		color: var(--z-accent);
	}
	.on::after {
		content: '';
		position: absolute;
		bottom: 3px;
		width: 4px;
		height: 4px;
		border-radius: 999px;
		background: currentColor;
	}
	.starred {
		color: var(--z-ch-flagged-solid);
	}
	/* On a phone the three parts are one row. */
	.left,
	.center,
	.right {
		display: contents;
	}
	.scrub {
		display: flex;
		flex: 1.4;
		align-items: center;
		gap: 10px;
		color: var(--z-soft);
		font-size: 12px;
	}
	.scrub input {
		flex: 1;
		min-width: 0;
		accent-color: var(--z-accent);
	}
	.vol {
		display: flex;
		align-items: center;
	}
	.vol input {
		width: 84px;
		accent-color: var(--z-accent);
	}
	@media (pointer: coarse) {
		.vol {
			display: none;
		}
		.play {
			width: 44px;
			height: 44px;
		}
	}
	/* A narrow window: the volume gives before the seek bar does. */
	@media (max-width: 899px) {
		.vol input {
			width: 56px;
		}
	}
	@media (max-width: 767px) {
		.wide {
			display: none !important;
		}
		.line {
			display: block;
		}
	}
	@media (min-width: 768px) {
		.line {
			display: none;
		}
		.bar {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr);
			height: 76px;
			padding: 0 16px;
		}
		.left {
			display: flex;
			align-items: center;
			gap: 6px;
			min-width: 0;
		}
		.now {
			flex: 0 1 auto;
		}
		.now :global(.cover) {
			width: 52px;
		}
		.center {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-self: center;
			width: 100%;
			max-width: 640px;
		}
		.center .scrub {
			flex: none;
			width: 100%;
			margin-top: -2px;
		}
		.right {
			display: flex;
			align-items: center;
			justify-content: flex-end;
			gap: 4px;
		}
	}
</style>
