<script lang="ts">
	import { api } from '#lib/api';
	import { notify } from '#lib/notice.svelte';
	import { player } from '#lib/player.svelte';
	import type { Album, Song } from '#lib/types';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';

	/** `artist` is off on the artist's own page, where every tile would repeat it. */
	let { album, artist = true }: { album: Album; artist?: boolean } = $props();

	async function play() {
		const response = await api(`/api/album/${encodeURIComponent(album.id)}`).catch(() => null);
		if (response?.ok) player.play((await response.json()) as Song[]);
		else notify(`Could not play ${album.name}.`);
	}
</script>

<div class="tile">
	<a href="/album/{album.id}">
		<Cover id={album.coverArt} class="mb-1.5" />
		<span class="name">{album.name}</span>
		<span class="by">
			{#if artist && album.artist}<span class="who">{album.artist}</span>{/if}
			{#if album.year}<span class="year">{album.year}</span>{/if}
		</span>
	</a>
	<!-- Beside the link, not in it: a button inside a link is read out as part of the link. -->
	<span class="over">
		<button class="play" type="button" aria-label="Play {album.name}" onclick={play}>
			<Icon name="play" class="size-4" />
		</button>
	</span>
</div>

<style>
	.tile {
		position: relative;
		min-width: 0;
	}
	a {
		display: flex;
		flex-direction: column;
		gap: 2px;
		color: inherit;
		text-decoration: none;
	}
	.name {
		overflow: hidden;
		color: var(--z-ink);
		font-size: 13.5px;
		font-weight: 600;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	/* muted, not soft: this sits on the canvas, where soft falls under 4.5:1. */
	.by {
		display: flex;
		color: var(--z-muted);
		font-size: 12.5px;
		white-space: nowrap;
	}
	/* A long artist gives way; the year stays. */
	.who {
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.who + .year::before {
		content: '·';
		margin: 0 0.35em;
	}
	/* The cover's square, for the play button to sit in its corner. */
	.over {
		position: absolute;
		inset: 0 0 auto;
		aspect-ratio: 1;
		pointer-events: none;
	}
	.play {
		position: absolute;
		right: 8px;
		bottom: 8px;
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: 1px solid var(--z-accent-edge);
		border-radius: 999px;
		background: var(--z-accent);
		color: var(--z-accent-fg);
		box-shadow: var(--z-shadow-menu);
		opacity: 0;
		transform: translateY(4px);
		transition:
			opacity 140ms ease,
			transform 140ms ease;
		pointer-events: auto;
		cursor: pointer;
	}
	.tile:hover .play,
	.play:focus-visible {
		opacity: 1;
		transform: none;
	}
	@media (hover: none) {
		.play {
			display: none;
		}
	}
</style>
