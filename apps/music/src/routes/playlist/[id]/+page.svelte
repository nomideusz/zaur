<script lang="ts">
	import { formatTime, player } from '#lib/player.svelte';
	import Cover from '#lib/components/Cover.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import TrackList from '#lib/components/TrackList.svelte';

	let { data } = $props();
	const list = $derived(data.playlist);
	const songs = $derived(list.entry ?? []);
</script>

<svelte:head><title>{list.name} · Zaur Music</title></svelte:head>

<div class="page">
	<header class="hero">
		<Cover id={list.coverArt} size={300} class="w-40 shrink-0 !rounded-xl" />
		<div class="min-w-0">
			<span class="z-caption">Playlist</span>
			<h1>{list.name}</h1>
			<p class="z-caption">{songs.length} songs · {formatTime(list.duration)}</p>
			<div class="actions mt-3">
				<button class="btn-tactile btn-primary tall" type="button" onclick={() => player.play(songs)}><Icon name="play" /> Play</button>
				<button class="btn-tactile tall" type="button" onclick={() => player.shuffle(songs)}><Icon name="shuffle" /> Shuffle</button>
			</div>
		</div>
	</header>
	<TrackList {songs} />
</div>

<style>
	.hero {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 20px;
		margin-bottom: 24px;
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
