<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { adds, pending } from '#lib/adds.svelte';
	import { notify } from '#lib/notice.svelte';
	import { formatTime, isStarred, player, toggleStar } from '#lib/player.svelte';
	import Cover from '#lib/components/Cover.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PlaylistPicker from '#lib/components/PlaylistPicker.svelte';
	import TrackList from '#lib/components/TrackList.svelte';

	let { data } = $props();
	let picker: PlaylistPicker;
	const album = $derived(data.album);
	const songs = $derived(album.song ?? []);

	// The rest of the album, added from YouTube: how far that has come.
	const adding = $derived(adds.jobs.filter((job) => job.album === album.name));
	const waiting = $derived(adding.filter(pending).length);
	const failed = $derived(adding.filter((job) => job.status === 'failed').length);
	onMount(() => void adds.refresh());
	// Once the last of them is in, the library has scanned them a moment later: show them.
	let was = 0;
	$effect(() => {
		if (was && !waiting) setTimeout(invalidateAll, 3000);
		was = waiting;
	});

	async function addRest(id: number) {
		const queued = await adds.addAlbum(id);
		if (queued === 0) notify('The library has all of it already.');
		else if (queued === null) notify(adds.problem || 'Could not add the rest.');
	}
</script>

<svelte:head><title>{album.name} · Zaur Music</title></svelte:head>

<div class="page">
	<header class="hero">
		<Cover id={album.coverArt} size={600} class="art" />
		<div class="info">
			<span class="z-caption">Album</span>
			<h1>{album.name}</h1>
			<p>
				{#if album.artistId}<a class="link !text-[14px]" href="/artist/{album.artistId}">{album.artist}</a>{:else}{album.artist}{/if}
				<span class="z-caption">
					{[album.year, `${songs.length} ${songs.length === 1 ? 'song' : 'songs'}`, formatTime(album.duration)].filter(Boolean).join(' · ')}
				</span>
			</p>
			<div class="actions">
				<button class="btn-tactile btn-primary tall" type="button" disabled={!songs.length} onclick={() => player.play(songs)}>
					<Icon name="play" /> Play
				</button>
				<button class="btn-tactile tall" type="button" disabled={!songs.length} onclick={() => player.shuffle(songs)}>
					<Icon name="shuffle" /> Shuffle
				</button>
				<button
					class="btn-tactile tall"
					class:starred={isStarred(album)}
					type="button"
					aria-pressed={isStarred(album)}
					aria-label={isStarred(album) ? 'Remove album from favourites' : 'Add album to favourites'}
					onclick={() => toggleStar(album)}
				>
					<Icon name={isStarred(album) ? 'heart-filled' : 'heart'} />
				</button>
				<button
					class="btn-tactile tall"
					type="button"
					aria-label="Add album to a playlist"
					title="Add to playlist…"
					disabled={!songs.length}
					onclick={() => picker.open(songs)}
				>
					<Icon name="playlist" />
				</button>
			</div>
			{#if waiting}
				<p class="z-caption rest">Adding {adding.length - waiting} of {adding.length} from YouTube…</p>
			{:else if data.rest}
				{#await data.rest then rest}
					{#if rest?.missing}
						<p class="rest">
							<button class="btn-tactile tall" type="button" disabled={adds.sending} onclick={() => addRest(rest.id)}>
								<Icon name="add" /> Add the other {rest.missing} {rest.missing === 1 ? 'song' : 'songs'}
							</button>
							{#if failed}<span class="z-caption">{failed} could not be found on YouTube.</span>{/if}
						</p>
					{/if}
				{/await}
			{/if}
		</div>
	</header>

	<TrackList {songs} numbered by={album.artist} />
</div>
<PlaylistPicker bind:this={picker} />

<style>
	.rest {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 12px;
		margin: 6px 0 0;
	}
	.hero {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 24px;
		margin-bottom: 24px;
	}
	.hero :global(.art) {
		width: min(220px, 60vw);
		border-radius: 12px;
		box-shadow: var(--z-shadow-menu);
	}
	.info {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 6px;
		min-width: 240px;
	}
	h1 {
		margin: 0;
		color: var(--z-ink);
		font-size: clamp(22px, 4vw, 32px);
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.01em;
	}
	p {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 8px;
		margin: 0 0 8px;
	}
	.starred {
		color: var(--z-ch-flagged-solid);
	}
	/* On the narrowest phones the four fit one row only with a little less air. */
	@media (max-width: 359px) {
		.actions {
			gap: 6px;
		}
		.actions .tall {
			padding: 0 12px;
		}
	}
</style>
