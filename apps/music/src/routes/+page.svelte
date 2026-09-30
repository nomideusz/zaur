<script lang="ts">
	import { api } from '#lib/api';
	import { notify } from '#lib/notice.svelte';
	import { player } from '#lib/player.svelte';
	import AlbumTile from '#lib/components/AlbumTile.svelte';
	import Cover from '#lib/components/Cover.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import TrackList from '#lib/components/TrackList.svelte';
	import type { Song } from '#lib/types';

	let { data } = $props();

	let shuffling = $state(false);
	async function shuffleAll() {
		shuffling = true;
		const response = await api('/api/shuffle').catch(() => null);
		const songs = response?.ok ? ((await response.json()) as Song[]) : null;
		shuffling = false;
		if (songs?.length) player.play(songs);
		else notify(songs ? 'The library is empty.' : 'Could not load songs to shuffle. Try again?');
	}
</script>

<svelte:head><title>Zaur Music</title></svelte:head>

<div class="page">
	<header class="page-head">
		<h1>Home</h1>
		<div class="actions">
			<button class="btn-tactile btn-primary tall" type="button" onclick={shuffleAll} disabled={shuffling}>
				<Icon name="shuffle" /> Shuffle all
			</button>
			<!-- The phone's tab row has Add but no room for these two; the sidebar has all three. -->
			<a class="btn-tactile tall md:!hidden" href="/playlists"><Icon name="playlist" /> Playlists</a>
			<a class="btn-tactile tall md:!hidden" href="/favourites"><Icon name="heart" /> Favourites</a>
			<a class="btn-tactile tall max-md:!hidden" href="/add"><Icon name="add" /> Add from YouTube</a>
		</div>
	</header>

	{#if data.recent.length}
		<section class="section">
			<div class="section-head"><h2>Recently played</h2><a href="/albums?sort=recent">See all</a></div>
			<div class="album-row">
				{#each data.recent as album (album.id)}<AlbumTile {album} />{/each}
			</div>
		</section>
	{/if}

	<section class="section">
		<div class="section-head"><h2>Recently added</h2><a href="/albums?sort=newest">See all</a></div>
		{#if data.newest.length}
			<div class="album-row">
				{#each data.newest as album (album.id)}<AlbumTile {album} />{/each}
			</div>
		{:else}
			<p class="empty-note">The library is empty. <a class="link" href="/add">Add something from YouTube</a>.</p>
		{/if}
	</section>

	{#if data.frequent.length}
		<section class="section">
			<div class="section-head"><h2>Most played</h2><a href="/albums?sort=frequent">See all</a></div>
			<div class="album-row">
				{#each data.frequent as album (album.id)}<AlbumTile {album} />{/each}
			</div>
		</section>
	{/if}

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

	<form class="signout" method="POST" action="/auth/logout">
		<span class="z-caption">Signed in as <span class="z-mono">{data.user.email}</span></span>
		<button class="btn-tactile" type="submit"><Icon name="logout" /> Sign out</button>
	</form>
</div>

<style>
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
	.signout {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-top: 40px;
		padding-top: 16px;
		border-top: 1px solid var(--z-hairline);
	}
	@media (min-width: 768px) {
		.signout {
			display: none;
		}
	}
</style>
