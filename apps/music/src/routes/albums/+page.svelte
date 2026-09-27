<script lang="ts">
	import AlbumTile from '#lib/components/AlbumTile.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Albums · Zaur Music</title></svelte:head>

<div class="page">
	<header class="page-head">
		<h1>Albums</h1>
	</header>
	<nav class="sorts" aria-label="Order">
		{#each Object.entries(data.sorts) as [key, label] (key)}
			<a class="sort" href="?sort={key}" aria-current={data.sort === key ? 'true' : undefined} data-sveltekit-reset="false">{label}</a>
		{/each}
	</nav>

	<div class="album-grid">
		{#each data.albums as album (album.id)}<AlbumTile {album} />{/each}
	</div>

	{#if data.albums.length >= data.count && data.count < 500}
		<div class="more">
			<a class="btn-tactile tall" href="?sort={data.sort}&count={data.count + 60}" data-sveltekit-reset="false">Show more</a>
		</div>
	{/if}
</div>

<style>
	.sorts {
		display: flex;
		gap: 6px;
		margin: -6px 0 20px;
		padding-bottom: 2px;
		overflow-x: auto;
	}
	.sort {
		flex-shrink: 0;
		padding: 5px 12px;
		border: 1px solid var(--z-line);
		border-radius: 999px;
		background: var(--z-surface);
		color: var(--z-strong);
		font-size: 13px;
		font-weight: 500;
		text-decoration: none;
	}
	.sort[aria-current] {
		border-color: var(--z-accent-stroke);
		background: var(--z-accent-soft);
		color: var(--z-accent-ink);
		font-weight: 600;
	}
	.more {
		display: flex;
		justify-content: center;
		margin-top: 28px;
	}
</style>
