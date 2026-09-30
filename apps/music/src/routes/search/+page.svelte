<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { adds, isLink, pending } from '#lib/adds.svelte';
	import { notify } from '#lib/notice.svelte';
	import { visit } from '#lib/visit.svelte';
	import AddList from '#lib/components/AddList.svelte';
	import AlbumTile from '#lib/components/AlbumTile.svelte';
	import Cover from '#lib/components/Cover.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import SearchField from '#lib/components/SearchField.svelte';
	import TrackList from '#lib/components/TrackList.svelte';
	import type { OutsideAlbum } from '#lib/types';

	let { data } = $props();
	// Seeded from the URL; the field owns it while you type.
	let query = $state(untrack(() => data.q));
	// What the field last asked the URL for.
	let asked = untrack(() => data.q);
	let timer: ReturnType<typeof setTimeout> | undefined;

	// Search as you type, a beat after the last key; the URL keeps the query.
	function typed() {
		clearTimeout(timer);
		// A pasted link is for adding, not for looking up.
		if (isLink(query)) return;
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
	const nothing = $derived(data.q && !isLink(data.q) && !data.artists.length && !data.albums.length && !data.songs.length);

	async function addLink() {
		if (await adds.add(query)) {
			query = '';
			typed();
		}
	}

	// An album out there: how far adding it has come, from this person's list.
	function albumState(album: OutsideAlbum) {
		const mine = adds.jobs.filter((job) => job.album === album.title);
		return { total: mine.length, waiting: mine.filter(pending).length, failed: mine.filter((job) => job.status === 'failed').length };
	}
	async function addAlbum(album: OutsideAlbum) {
		const queued = await adds.addAlbum(album.id);
		if (queued === 0) notify(`All of ${album.title} is in the library already.`);
		else if (queued) notify(`Adding ${queued} ${queued === 1 ? 'song' : 'songs'} from ${album.title}`);
	}

	onMount(() => {
		void adds.refresh();
		// Shared from another app through the installed app's share target: the link comes as
		// url, or inside text (YouTube's app sends it that way). /add sends shares on here.
		const [url, text, title] = ['url', 'text', 'title'].map((key) => page.url.searchParams.get(key)?.trim() ?? '');
		const shared = [url, text, title].filter(Boolean).join(' ');
		if (!shared) return;
		if (isLink(shared)) {
			// A real navigation: a shallow replaceState leaves Kit the shared address to come Back to, and the add runs again.
			void visit('/search', { replace: true });
			void adds.add(shared);
			return;
		}
		// Words with no link (a song's name shared from elsewhere): look them up. What was
		// shared, or failing that its subject line; both together find nothing.
		query = asked = text || title;
		void visit(`/search?q=${encodeURIComponent(query)}`, { replace: true });
	});
</script>

<svelte:head><title>{data.q ? `${data.q} · ` : ''}Search · Zaur Music</title></svelte:head>

<div class="page">
	<h1 class="sr-only">Search</h1>
	<form method="GET" onsubmit={(event) => (event.preventDefault(), isLink(query) ? addLink() : typed())}>
		<!-- svelte-ignore a11y_autofocus -->
		<SearchField
			large
			name="q"
			placeholder="Songs, albums, artists, or a YouTube link"
			aria-label="Search, or paste a YouTube link to add"
			autofocus={!data.q}
			bind:value={query}
			oninput={typed}
			onclear={typed}
		/>
	</form>

	{#if isLink(query)}
		<div class="paste">
			<button class="btn-tactile btn-primary tall" type="button" disabled={adds.sending} onclick={addLink}>
				<Icon name="add" /> Add this video
			</button>
			<span class="z-caption">Its audio goes into the library, with the video's thumbnail as its cover.</span>
		</div>
	{/if}
	{#if adds.problem}<p class="problem"><Icon name="alert" /> {adds.problem}</p>{/if}

	{#if nothing}
		<p class="empty-note">Nothing in the library matches “{data.q}”.</p>
	{:else if !data.q && !isLink(query)}
		<p class="empty-note">
			Find a song, an album or an artist. What the library doesn't have yet can be added from YouTube, a song or a whole
			album at a time; so can a YouTube or Bartube link pasted here. The library is shared by everyone on Zaur Music.
		</p>
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

	{#if data.outside}
		{#await data.outside}
			<p class="empty-note looking">Looking for more on YouTube…</p>
		{:then outside}
			{#if outside.albums.length}
				<section class="section">
					<div class="section-head"><h2>Albums to add</h2></div>
					<div class="album-grid">
						{#each outside.albums as album (album.id)}
							{@const state = albumState(album)}
							<div class="outside">
								<img class="cover" src={album.cover} alt="" loading="lazy" />
								<span class="name">{album.title}</span>
								<span class="by">{album.artist} · {album.tracks} songs{album.kind === 'ep' ? ' · EP' : ''}</span>
								{#if state.waiting}
									<span class="z-caption">Adding {state.total - state.waiting} of {state.total}…</span>
								{:else if state.total}
									<span class="z-caption">
										Added{state.failed ? ` · ${state.failed} not found` : ''}
									</span>
								{:else}
									<button class="btn-tactile tall" type="button" disabled={adds.sending} onclick={() => addAlbum(album)}>
										<Icon name="add" /> Add album
									</button>
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/if}
			{#if outside.videos.length}
				<section class="section">
					<div class="section-head"><h2>Songs on YouTube</h2></div>
					<AddList videos={outside.videos} />
				</section>
			{/if}
			{#if outside.failed}
				<p class="empty-note">Could not look everywhere just now; search again in a moment for more.</p>
			{:else if !outside.albums.length && !outside.videos.length}
				<p class="empty-note">Nothing on YouTube for “{data.q}” either.</p>
			{/if}
		{/await}
	{/if}

	{#if adds.jobs.length}
		<section class="section">
			<div class="section-head"><h2>Recent adds</h2></div>
			<AddList />
		</section>
	{/if}
</div>

<style>
	.paste {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 12px;
		margin-top: 12px;
	}
	.problem {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 10px 0 0;
		color: var(--z-danger);
	}
	.looking {
		animation: pulse 1.2s ease-in-out infinite alternate;
	}
	@keyframes pulse {
		to {
			opacity: 0.5;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.looking {
			animation: none;
		}
	}
	.outside {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.outside .cover {
		width: 100%;
		aspect-ratio: 1;
		margin-bottom: 6px;
		border-radius: 8px;
		background: var(--z-sunken);
		object-fit: cover;
	}
	.outside .name,
	.outside .by {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.outside .name {
		color: var(--z-ink);
		font-size: 13.5px;
		font-weight: 600;
	}
	/* muted, not soft: this sits on the canvas, where soft falls under 4.5:1. */
	.outside .by {
		margin-bottom: 6px;
		color: var(--z-muted);
		font-size: 12.5px;
	}
	.outside button {
		align-self: flex-start;
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
