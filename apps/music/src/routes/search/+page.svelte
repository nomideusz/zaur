<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { visit } from '#lib/visit.svelte';
	import AlbumTile from '#lib/components/AlbumTile.svelte';
	import Cover from '#lib/components/Cover.svelte';
	import SearchField from '#lib/components/SearchField.svelte';
	import TrackList from '#lib/components/TrackList.svelte';

	let { data } = $props();
	// Seeded from the URL; the field owns it while you type.
	let query = $state(untrack(() => data.q));
	// What the field last asked the URL for.
	let asked = untrack(() => data.q);
	let timer: ReturnType<typeof setTimeout> | undefined;

	// Search as you type, a beat after the last key; the URL keeps the query.
	function typed() {
		clearTimeout(timer);
		timer = setTimeout(() => {
			asked = query.trim();
			void visit(asked ? `?q=${encodeURIComponent(asked)}` : '?', { replace: true, reset: false });
		}, 250);
	}
	// A query the field did not ask for — the Search tab tapped again, Back to
	// an older search — takes the field with it. (Not data.q against the field:
	// results for "mit" land while "mits" is already typed.)
	afterNavigate(() => {
		if (data.q === asked) return;
		clearTimeout(timer);
		query = asked = data.q;
	});
	// Left before the beat was up: the search must not take the next page's address.
	onDestroy(() => clearTimeout(timer));
	const nothing = $derived(data.q && !data.artists.length && !data.albums.length && !data.songs.length);
</script>

<svelte:head><title>{data.q ? `${data.q} · ` : ''}Search · Zaur Music</title></svelte:head>

<div class="page">
	<h1 class="sr-only">Search</h1>
	<form method="GET" onsubmit={(event) => (event.preventDefault(), typed())}>
		<!-- svelte-ignore a11y_autofocus -->
		<SearchField
			large
			name="q"
			placeholder="Songs, albums, artists"
			aria-label="Search"
			autofocus={!data.q}
			bind:value={query}
			oninput={typed}
			onclear={typed}
		/>
	</form>

	{#if nothing}
		<p class="empty-note">Nothing in the library matches “{data.q}”. <a class="link" href="/add">Add it from YouTube?</a></p>
	{:else if !data.q}
		<p class="empty-note">Find a song, an album or an artist in the library.</p>
	{/if}

	{#if data.artists.length}
		<section class="section">
			<div class="section-head"><h2>Artists</h2></div>
			<div class="chips">
				{#each data.artists as artist (artist.id)}
					<a class="chip" href="/artist/{artist.id}">
						<Cover id={artist.coverArt} size={96} class="w-7 shrink-0 !rounded-full" />
						<span class="truncate">{artist.name}</span>
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
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 8px;
		max-width: 100%;
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
