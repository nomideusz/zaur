<script lang="ts">
	import { player } from '#lib/player.svelte';
	import AlbumTile from '#lib/components/AlbumTile.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import TrackList from '#lib/components/TrackList.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Favourites · Zaur Music</title></svelte:head>

<div class="page">
	<header class="page-head">
		<h1>Favourites</h1>
		{#if data.songs.length}
			<div class="actions">
				<button class="btn-tactile btn-primary tall" type="button" onclick={() => player.play(data.songs)}><Icon name="play" /> Play</button>
				<button class="btn-tactile tall" type="button" onclick={() => player.shuffle(data.songs)}><Icon name="shuffle" /> Shuffle</button>
			</div>
		{/if}
	</header>

	{#if data.songs.length}
		<TrackList songs={data.songs} />
	{:else}
		<p class="empty-note">Tap the heart on a song to keep it here.</p>
	{/if}

	{#if data.albums.length}
		<section class="section">
			<div class="section-head"><h2>Albums</h2></div>
			<div class="album-grid">
				{#each data.albums as album (album.id)}<AlbumTile {album} />{/each}
			</div>
		</section>
	{/if}
</div>
