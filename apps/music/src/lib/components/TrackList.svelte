<script lang="ts">
	import { formatTime, isStarred, player, toggleStar } from '#lib/player.svelte';
	import type { Song } from '#lib/types';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';
	import SongMenu from './SongMenu.svelte';

	/**
	 * Songs as rows. Tapping one plays the list from there; the heart
	 * favourites, the dots open the row's menu (queue, playlist, album, artist).
	 * `numbered` is the album view: track numbers, a caption between discs, and
	 * the artist only on the rows where it differs from `albumArtist`.
	 * `onremove` is for a playlist you own (see SongMenu).
	 */
	let {
		songs,
		numbered = false,
		albumArtist,
		onremove
	}: { songs: Song[]; numbered?: boolean; albumArtist?: string; onremove?: (index: number) => void } = $props();

	let menu: SongMenu;
	const discs = $derived(numbered && new Set(songs.map((song) => song.discNumber ?? 1)).size > 1);
</script>

<ol class="tracks">
	{#each songs as song, i (`${song.id}-${i}`)}
		{@const current = player.current?.id === song.id}
		{@const starred = isStarred(song)}
		{@const meta = numbered ? (song.artist === albumArtist ? '' : song.artist) : [song.artist, song.album].filter(Boolean).join(' · ')}
		{#if discs && song.discNumber !== songs[i - 1]?.discNumber}
			<li class="disc z-caption">Disc {song.discNumber ?? 1}</li>
		{/if}
		<li class="track" class:current aria-current={current ? 'true' : undefined}>
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
					{#if meta}<span class="meta">{meta}</span>{/if}
				</span>
			</button>
			<button
				class="z-icon-btn"
				class:starred
				type="button"
				aria-label={starred ? 'Remove from favourites' : 'Add to favourites'}
				aria-pressed={starred}
				onclick={() => toggleStar(song)}
			>
				<Icon name={starred ? 'heart-filled' : 'heart'} />
			</button>
			<button
				class="z-icon-btn"
				type="button"
				aria-label="More for {song.title}"
				aria-haspopup="dialog"
				onclick={(event) => menu.open(song, i, event.currentTarget)}
			>
				<Icon name="more" />
			</button>
			<span class="dur z-mono">{formatTime(song.duration)}</span>
		</li>
	{/each}
</ol>
<SongMenu bind:this={menu} album={!numbered} {onremove} />

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
	.disc {
		padding: 14px 8px 4px;
	}
	.disc:first-child {
		padding-top: 0;
	}
	.main {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 12px;
		min-width: 0;
		/* Same floor with or without the artist line under the title. */
		min-height: 44px;
		padding: 7px 8px;
		border: 0;
		/* The focus ring follows the row's corners. */
		border-radius: 10px;
		background: none;
		text-align: left;
		cursor: pointer;
	}
	.z-icon-btn {
		width: 32px;
		height: 32px;
		flex-shrink: 0;
	}
	@media (pointer: coarse) {
		.z-icon-btn {
			width: 44px;
			height: 44px;
		}
		.track {
			gap: 0;
		}
	}
	.num {
		display: grid;
		place-items: center;
		width: 24px;
		flex-shrink: 0;
		color: var(--z-muted);
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
	/* muted, not soft: these sit on the canvas, where soft falls under 4.5:1. */
	.meta {
		color: var(--z-muted);
		font-size: 12.5px;
	}
	/* The playing row is a selection surface, like the sidebar's current section. */
	.current {
		background: var(--z-accent-tint);
	}
	.current .title,
	.current .num {
		color: var(--z-accent-ink);
	}
	.starred {
		color: var(--z-ch-flagged-solid);
	}
	.dur {
		width: 44px;
		color: var(--z-muted);
		font-size: 12px;
		text-align: right;
	}
	@media (max-width: 640px) {
		.dur {
			display: none;
		}
	}
</style>
