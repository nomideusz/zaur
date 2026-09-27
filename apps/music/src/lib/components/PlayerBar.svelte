<script lang="ts">
	import { formatTime, player } from '#lib/player.svelte';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';

	/** The mini player along the bottom; tapping the song opens Now playing. */
	const song = $derived(player.current);
	const progress = $derived(player.duration ? (player.time / player.duration) * 100 : 0);
</script>

{#if song}
	<div class="bar">
		<span class="line" style="width: {progress}%"></span>
		<button class="now" type="button" onclick={() => (player.open = true)} aria-label="Open Now playing">
			<Cover id={song.coverArt} size={96} class="w-11 shrink-0 !rounded-md" />
			<span class="text">
				<span class="title">{song.title}</span>
				<span class="meta">{song.artist ?? ''}</span>
			</span>
		</button>

		<div class="transport">
			<button class="z-icon-btn !size-9 wide" type="button" aria-label="Previous" onclick={() => player.prev()}>
				<Icon name="prev" />
			</button>
			<button class="play" type="button" aria-label={player.playing ? 'Pause' : 'Play'} onclick={() => player.toggle()}>
				<Icon name={player.playing ? 'pause' : 'play'} class="size-4" />
			</button>
			<button class="z-icon-btn !size-9" type="button" aria-label="Next" onclick={() => player.next()}>
				<Icon name="next" />
			</button>
		</div>

		<div class="scrub wide">
			<span class="z-mono">{formatTime(player.time)}</span>
			<input
				type="range"
				min="0"
				max={player.duration || 0}
				step="1"
				value={player.time}
				aria-label="Position"
				oninput={(event) => player.seek(Number(event.currentTarget.value))}
			/>
			<span class="z-mono">{formatTime(player.duration)}</span>
		</div>

		<button class="z-icon-btn !size-9 wide" type="button" aria-label="Queue" title="Queue" onclick={() => (player.open = true)}>
			<Icon name="queue" />
		</button>
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
		accent-color: var(--z-accent);
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
		.now {
			flex: 1;
		}
	}
</style>
