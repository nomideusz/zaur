<script lang="ts">
	import type { RelatedArtist } from '#lib/types';
	import Icon from './Icon.svelte';

	/** A shelf of artists: one the library has opens its page, any other a search with its albums to add. */
	let { artists }: { artists: RelatedArtist[] } = $props();

	const caption = (a: RelatedArtist) =>
		a.id ? 'In the library' : a.like?.length ? `Like ${a.like.slice(0, 2).join(' and ')}` : 'To add';
</script>

<div class="album-row">
	{#each artists as artist (artist.name)}
		<a class="artist" href={artist.id ? `/artist/${artist.id}` : `/search?q=${encodeURIComponent(artist.name)}`}>
			<span class="picture">
				{#if artist.picture}
					<img src={artist.picture} alt="" loading="lazy" decoding="async" />
				{:else}
					<Icon name="note" class="size-[40%] text-[var(--z-faint)]" />
				{/if}
			</span>
			<span class="name">{artist.name}</span>
			<span class="by">{caption(artist)}</span>
		</a>
	{/each}
</div>

<style>
	.artist {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		text-align: center;
		text-decoration: none;
	}
	.picture {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		margin-bottom: 6px;
		overflow: hidden;
		border-radius: 50%;
		background: var(--z-sunken);
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.name,
	.by {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.name {
		color: var(--z-ink);
		font-size: 13.5px;
		font-weight: 600;
	}
	.by {
		color: var(--z-muted);
		font-size: 12.5px;
	}
</style>
