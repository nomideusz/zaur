<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import AlbumTile from '#lib/components/AlbumTile.svelte';
	import Cover from '#lib/components/Cover.svelte';
	import TrackList from '#lib/components/TrackList.svelte';

	let { data } = $props();
	// Seeded once from the URL; the field owns it after that.
	let query = $state(untrack(() => data.q));
	let timer: ReturnType<typeof setTimeout> | undefined;

	// Search as you type, a beat after the last key; the URL keeps the query.
	function typed() {
		clearTimeout(timer);
		timer = setTimeout(() => {
			const q = query.trim();
			goto(q ? `?q=${encodeURIComponent(q)}` : '?', { replace: true, reset: false });
		}, 250);
	}
	const nothing = $derived(data.q && !data.artists.length && !data.albums.length && !data.songs.length);
</script>

<svelte:head><title>{data.q ? `${data.q} · ` : ''}Search · Zaur Music</title></svelte:head>

<div class="page">
	<form class="box" method="GET" onsubmit={(event) => (event.preventDefault(), typed())}>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			class="z-field"
			type="search"
			name="q"
			placeholder="Songs, albums, artists"
			aria-label="Search"
			autocomplete="off"
			autofocus={!data.q}
			bind:value={query}
			oninput={typed}
		/>
	</form>

	{#if nothing}
		<p class="empty-note">Nothing in the library matches “{data.q}”. <a class="link" href="/add">Add it from YouTube?</a></p>
	{/if}

	{#if data.artists.length}
		<section class="section">
			<div class="section-head"><h2>Artists</h2></div>
			<div class="chips">
				{#each data.artists as artist (artist.id)}
					<a class="chip" href="/artist/{artist.id}">
						<Cover id={artist.coverArt} size={96} class="w-7 !rounded-full" />
						{artist.name}
					</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if data.songs.length}
		<section class="section">
			<div class="section-head"><h2>Songs</h2></div>
			<TrackList songs={data.songs} />
		</section>
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

<style>
	.box input {
		width: 100%;
		height: 44px;
		font-size: 16px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 12px 4px 4px;
		border: 1px solid var(--z-line);
		border-radius: 999px;
		background: var(--z-surface);
		color: var(--z-ink);
		font-weight: 500;
		text-decoration: none;
	}
	.chip:hover {
		border-color: var(--z-faint);
	}
</style>
