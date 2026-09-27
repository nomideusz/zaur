<script lang="ts">
	import { formatTime, isStarred, player, toggleStar } from '#lib/player.svelte';
	import type { Song } from '#lib/types';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';

	/**
	 * Songs as rows. Tapping one plays the list from there; the heart
	 * favourites, the queue button slots the song in after the current one.
	 * `numbered` is the album view (track numbers, no album in the meta).
	 */
	let { songs, numbered = false }: { songs: Song[]; numbered?: boolean } = $props();
</script>

<ol class="tracks">
	{#each songs as song, i (`${song.id}-${i}`)}
		{@const current = player.current?.id === song.id}
		{@const starred = isStarred(song)}
		<li class="track" class:current>
			<button class="main" type="button" onclick={() => player.play(songs, i)}>
				{#if numbered}
					<span class="num z-mono">
						{#if current && player.playing}<Icon name="note" class="size-3.5" />{:else}{song.track ?? i + 1}{/if}
					</span>
				{:else}
					<Cover id={song.coverArt} size={96} class="w-10 shrink-0 !rounded-md" />
				{/if}
				<span class="text">
					<span class="title">{song.title}</span>
					<span class="meta">{[song.artist, numbered ? null : song.album].filter(Boolean).join(' · ')}</span>
				</span>
			</button>
			<button
				class="z-icon-btn !size-8"
				class:starred
				type="button"
				aria-label={starred ? 'Remove from favourites' : 'Add to favourites'}
				aria-pressed={starred}
				onclick={() => toggleStar(song)}
			>
				<Icon name={starred ? 'heart-filled' : 'heart'} />
			</button>
			<button class="z-icon-btn !size-8" type="button" aria-label="Play next" title="Play next" onclick={() => player.playNext(song)}>
				<Icon name="queue" />
			</button>
			<span class="dur z-mono">{formatTime(song.duration)}</span>
		</li>
	{/each}
</ol>

<style>
	.tracks {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.track {
		display: flex;
		align-items: center;
		gap: 2px;
		padding-right: 8px;
		border-radius: 10px;
	}
	.track:hover {
		background: var(--z-hover);
	}
	.main {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 12px;
		min-width: 0;
		padding: 7px 8px;
		border: 0;
		background: none;
		text-align: left;
		cursor: pointer;
	}
	.num {
		display: grid;
		place-items: center;
		width: 24px;
		flex-shrink: 0;
		color: var(--z-soft);
		font-size: 12.5px;
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
		font-size: 14px;
		font-weight: 500;
	}
	.meta {
		color: var(--z-soft);
		font-size: 12.5px;
	}
	.current .title,
	.current .num {
		color: var(--z-accent);
	}
	.starred {
		color: var(--z-ch-flagged-solid);
	}
	.dur {
		width: 44px;
		color: var(--z-soft);
		font-size: 12px;
		text-align: right;
	}
	@media (max-width: 640px) {
		.dur {
			display: none;
		}
	}
</style>
