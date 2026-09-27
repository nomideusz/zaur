<script lang="ts">
	import { player } from '#lib/player.svelte';
	import type { Album, Song } from '#lib/types';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';

	let { album }: { album: Album } = $props();

	async function play(event: MouseEvent) {
		event.preventDefault();
		const response = await fetch(`/api/album/${encodeURIComponent(album.id)}`);
		if (response.ok) player.play((await response.json()) as Song[]);
	}
</script>

<a class="tile" href="/album/{album.id}">
	<span class="art">
		<Cover id={album.coverArt} />
		<button class="play" type="button" aria-label="Play {album.name}" onclick={play}>
			<Icon name="play" class="size-4" />
		</button>
	</span>
	<span class="name">{album.name}</span>
	<span class="by">{album.artist ?? ''}{album.year ? ` · ${album.year}` : ''}</span>
</a>

<style>
	.tile {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		color: inherit;
		text-decoration: none;
	}
	.art {
		position: relative;
		margin-bottom: 6px;
	}
	.name {
		overflow: hidden;
		color: var(--z-ink);
		font-size: 13.5px;
		font-weight: 600;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.by {
		overflow: hidden;
		color: var(--z-soft);
		font-size: 12.5px;
		white-space: nowrap;
		text-overflow: ellipsis;
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
