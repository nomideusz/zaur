<script lang="ts">
	import { player } from '#lib/player.svelte';
	import AlbumTile from '#lib/components/AlbumTile.svelte';
	import Cover from '#lib/components/Cover.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import TrackList from '#lib/components/TrackList.svelte';

	let { data } = $props();
	const artist = $derived(data.artist);
	const albums = $derived(artist.album ?? []);
	const songs = $derived(data.songs);

	// A long discography starts folded, so the albums stay within reach.
	const FOLD = 8;
	let all = $state(false);
	const shown = $derived(all ? songs : songs.slice(0, FOLD));
</script>

<svelte:head><title>{artist.name} · Zaur Music</title></svelte:head>

<div class="page">
	<header class="hero">
		<Cover id={artist.coverArt} size={300} class="w-28 shrink-0 !rounded-full" />
		<div class="min-w-0">
			<span class="z-caption">Artist</span>
			<h1>{artist.name}</h1>
			<p class="z-caption">
				{albums.length} {albums.length === 1 ? 'album' : 'albums'} · {songs.length} {songs.length === 1 ? 'song' : 'songs'}
			</p>
			<div class="actions mt-3">
				<button class="btn-tactile btn-primary tall" type="button" onclick={() => player.play(songs)} disabled={!songs.length}>
					<Icon name="play" /> Play
				</button>
				<button class="btn-tactile tall" type="button" onclick={() => player.shuffle(songs)} disabled={!songs.length}>
					<Icon name="shuffle" /> Shuffle
				</button>
			</div>
		</div>
	</header>

	{#if songs.length}
		<section class="section">
			<div class="section-head">
				<h2>Songs</h2>
				{#if songs.length > FOLD}
					<button class="link" type="button" aria-expanded={all} onclick={() => (all = !all)}>
						{all ? 'Show fewer' : `Show all ${songs.length}`}
					</button>
				{/if}
			</div>
			<!-- The whole list plays on from a row, folded or not. -->
			<TrackList songs={all ? songs : shown} />
		</section>
	{/if}

	<section class="section">
		<div class="section-head"><h2>Albums</h2></div>
		<div class="album-grid">
			{#each albums as album (album.id)}<AlbumTile {album} artist={false} />{/each}
		</div>
	</section>
</div>

<style>
	.hero {
		display: flex;
		align-items: center;
		gap: 20px;
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
