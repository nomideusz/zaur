<script lang="ts">
	import { api } from '#lib/api';
	import { notify } from '#lib/notice.svelte';
	import { player } from '#lib/player.svelte';
	import AlbumTile from '#lib/components/AlbumTile.svelte';
	import Cover from '#lib/components/Cover.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import TrackList from '#lib/components/TrackList.svelte';
	import type { Album, Song } from '#lib/types';

	let { data } = $props();

	let shuffling = $state(false);
	async function shuffleAll() {
		shuffling = true;
		const response = await api('/api/shuffle').catch(() => null);
		const songs = response?.ok ? ((await response.json()) as Song[]) : null;
		shuffling = false;
		if (songs?.length) player.shuffle(songs);
		else notify(songs ? 'The library is empty.' : 'Could not load songs to shuffle. Try again?');
	}

	// A shelf's previous and next: a row's width of tiles at a time.
	function turn(event: MouseEvent, by: number) {
		const row = (event.currentTarget as HTMLElement).closest('section')!.querySelector('.album-row')!;
		row.scrollBy({ left: by * row.clientWidth });
	}
</script>

<svelte:head><title>Zaur Music</title></svelte:head>

{#snippet shelf(title: string, sort: string, albums: Album[])}
	<section class="section">
		<div class="section-head">
			<h2>{title}</h2>
			<!-- ponytail: there even when every tile fits; measure the row to hide them if that bothers. -->
			<span class="turn">
				<button class="z-icon-btn" type="button" aria-label="{title}: previous" onclick={(event) => turn(event, -1)}>
					<Icon name="chevron-left" />
				</button>
				<button class="z-icon-btn" type="button" aria-label="{title}: next" onclick={(event) => turn(event, 1)}>
					<Icon name="chevron-right" />
				</button>
			</span>
			<a href="/albums?sort={sort}">See all</a>
		</div>
		<div class="album-row">
			{#each albums as album (album.id)}<AlbumTile {album} />{/each}
		</div>
	</section>
{/snippet}

<div class="page">
	<header class="page-head">
		<h1>Home</h1>
		<div class="actions">
			<button class="btn-tactile btn-primary tall" type="button" onclick={shuffleAll} disabled={shuffling}>
				<Icon name="shuffle" /> Shuffle all
			</button>
			<a class="btn-tactile tall max-md:hidden" href="/search"><Icon name="add" /> Add music</a>
			<!-- The phone's way to the account and Sign out (the sidebar has them on a wide screen). -->
			<a class="z-avatar size-11 text-[15px] no-underline md:hidden" href="/account" aria-label="Account: {data.user.name}">
				{[...data.user.name][0]?.toUpperCase()}
			</a>
		</div>
	</header>
	<!-- The phone's tab row has no room for these two (the sidebar has them on a wide screen). -->
	<nav class="shortcuts" aria-label="Your music">
		<a class="btn-tactile tall" href="/playlists"><Icon name="playlist" /> Playlists</a>
		<a class="btn-tactile tall" href="/favourites"><Icon name="heart" /> Favourites</a>
	</nav>

	{#if data.recent.length}{@render shelf('Recently played', 'recent', data.recent)}{/if}

	{#if data.newest.length}
		{@render shelf('Recently added', 'newest', data.newest)}
	{:else}
		<section class="section">
			<div class="section-head"><h2>Recently added</h2><a href="/albums?sort=newest">See all</a></div>
			<p class="empty-note">The library is empty. <a class="link" href="/search">Search for something to add</a>.</p>
		</section>
	{/if}

	{#if data.frequent.length}{@render shelf('Most played', 'frequent', data.frequent)}{/if}

	{#if data.playlists.length}
		<section class="section">
			<div class="section-head"><h2>Playlists</h2><a href="/playlists">See all</a></div>
			<div class="lists">
				{#each data.playlists as list (list.id)}
					<a class="list" href="/playlist/{list.id}">
						<Cover id={list.coverArt} size={96} class="w-12 shrink-0 !rounded-md" />
						<span class="min-w-0">
							<span class="block truncate font-semibold text-[var(--z-ink)]">{list.name}</span>
							<span class="z-caption">{list.songCount ?? 0} songs</span>
						</span>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<section class="section">
		<div class="section-head"><h2>Favourites</h2><a href="/favourites">See all</a></div>
		{#if data.favourites.length}
			<TrackList songs={data.favourites} />
		{:else}
			<p class="empty-note">Tap the heart on a song to keep it here.</p>
		{/if}
	</section>
</div>

<style>
	/* For a mouse with no sideways wheel. A finger swipes the row. */
	.turn {
		display: none;
	}
	@media (pointer: fine) {
		.turn {
			display: flex;
			align-self: center;
			margin: 0 10px 0 auto;
		}
	}
	.shortcuts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	@media (min-width: 768px) {
		.shortcuts {
			display: none;
		}
	}
	.lists {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 8px;
	}
	.list {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px;
		border: 1px solid var(--z-hairline);
		border-radius: 10px;
		background: var(--z-surface);
		text-decoration: none;
	}
	.list:hover {
		border-color: var(--z-line);
	}
</style>
