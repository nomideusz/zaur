<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import AlbumTile from '#lib/components/AlbumTile.svelte';
	import Icon from '#lib/components/Icon.svelte';

	let { data } = $props();
	let sorts: HTMLElement;

	// Arriving from Home's "See all" the lit chip can be off the right edge of a
	// phone: bring it to the middle of the row. (scrollLeft, not scrollIntoView,
	// which would also pull the page back up after "Show more".)
	$effect(() => {
		void data.sort;
		const chip = sorts.querySelector<HTMLElement>('[aria-current]');
		if (chip) sorts.scrollLeft = chip.offsetLeft - (sorts.clientWidth - chip.offsetWidth) / 2;
	});
</script>

<svelte:head><title>Albums · Zaur Music</title></svelte:head>

<div class="page">
	<header class="page-head">
		<h1>Albums</h1>
		<!-- Random has no "more": each load is a fresh draw. -->
		{#if data.sort === 'random'}
			<button class="btn-tactile tall" type="button" onclick={() => invalidateAll()}><Icon name="shuffle" /> Shuffle again</button>
		{/if}
	</header>
	<nav class="sorts" aria-label="Order" bind:this={sorts}>
		{#each Object.entries(data.sorts) as [key, label] (key)}
			<a class="sort" href="?sort={key}" aria-current={data.sort === key ? 'true' : undefined} data-sveltekit-reset="false">{label}</a>
		{/each}
	</nav>

	<div class="album-grid">
		{#each data.albums as album (album.id)}<AlbumTile {album} />{/each}
	</div>

	{#if data.sort !== 'random' && data.albums.length >= data.count}
		<div class="more">
			<a class="btn-tactile tall" href="?sort={data.sort}&count={data.count + 60}" data-sveltekit-reset="false">Show more</a>
		</div>
	{/if}
</div>

<style>
	.sorts {
		position: relative;
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
	@media (pointer: coarse) {
		.sort {
			padding: 11px 14px;
		}
	}
	.more {
		display: flex;
		justify-content: center;
		margin-top: 28px;
	}
</style>
