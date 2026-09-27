<script lang="ts">
	import { formatTime } from '#lib/player.svelte';
	import Cover from '#lib/components/Cover.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Playlists · Zaur Music</title></svelte:head>

<div class="page">
	<header class="page-head"><h1>Playlists</h1></header>
	{#if data.playlists.length}
		<div class="album-grid">
			{#each data.playlists as list (list.id)}
				<a class="tile" href="/playlist/{list.id}">
					<Cover id={list.coverArt} class="mb-1.5" />
					<span class="truncate font-semibold text-[var(--z-ink)]">{list.name}</span>
					<span class="z-caption truncate">{list.songCount ?? 0} songs · {formatTime(list.duration)}</span>
				</a>
			{/each}
		</div>
	{:else}
		<p class="empty-note">No playlists yet. Playlists made in Navidrome or a Subsonic app show up here.</p>
	{/if}
</div>

<style>
	.tile {
		display: flex;
		flex-direction: column;
		min-width: 0;
		text-decoration: none;
	}
</style>
