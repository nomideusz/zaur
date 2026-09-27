<script lang="ts">
	import { player } from '#lib/player.svelte';
	import AlbumTile from '#lib/components/AlbumTile.svelte';
	import Cover from '#lib/components/Cover.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { Song } from '#lib/types';

	let { data } = $props();
	const artist = $derived(data.artist);
	const albums = $derived(artist.album ?? []);

	async function shuffle() {
		const lists = await Promise.all(
			albums.map((album) => fetch(`/api/album/${encodeURIComponent(album.id)}`).then((r) => (r.ok ? (r.json() as Promise<Song[]>) : [])))
		);
		player.shuffle(lists.flat());
	}
</script>

<svelte:head><title>{artist.name} · Zaur Music</title></svelte:head>

<div class="page">
	<header class="hero">
		<Cover id={artist.coverArt} size={300} class="w-28 shrink-0 !rounded-full" />
		<div class="min-w-0">
			<span class="z-caption">Artist</span>
			<h1>{artist.name}</h1>
			<p class="z-caption">{albums.length} {albums.length === 1 ? 'album' : 'albums'}</p>
			<button class="btn-tactile btn-primary tall mt-2" type="button" onclick={shuffle} disabled={!albums.length}>
				<Icon name="shuffle" /> Shuffle
			</button>
		</div>
	</header>

	<div class="album-grid">
		{#each albums as album (album.id)}<AlbumTile {album} />{/each}
	</div>
</div>

<style>
	.hero {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 28px;
	}
	h1 {
		margin: 0;
		color: var(--z-ink);
		font-size: clamp(22px, 4vw, 32px);
		font-weight: 700;
		line-height: 1.15;
	}
	p {
		margin: 4px 0 0;
	}
</style>
