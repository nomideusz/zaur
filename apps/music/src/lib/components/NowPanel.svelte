<script lang="ts">
	import { isStarred, player, tintOf, toggleStar } from '#lib/player.svelte';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';
	import Queue from './Queue.svelte';

	/** Now playing beside the page, on a wide screen: the cover, the song, and the queue. Not modal. */
	const song = $derived(player.current);
</script>

{#if song}
	<aside class="panel" tabindex="-1" aria-label="Now playing" style:--tint={tintOf(song.coverArt) || undefined}>
		<header>
			<span class="z-caption">Now playing</span>
			<button class="z-icon-btn !size-8" type="button" aria-label="Hide" title="Hide" onclick={() => player.show()}>
				<Icon name="close" class="size-3.5" />
			</button>
		</header>
		<Cover id={song.coverArt} size={600} class="art" />
		<div class="about">
			<div class="min-w-0">
				<h2>{song.title}</h2>
				<p>{#if song.artistId}<a href="/artist/{song.artistId}">{song.artist}</a>{:else}<span>{song.artist ?? ''}</span>{/if}</p>
				{#if song.album}
					<p>{#if song.albumId}<a href="/album/{song.albumId}">{song.album}</a>{:else}<span>{song.album}</span>{/if}</p>
				{/if}
			</div>
			<button
				class="z-icon-btn !size-9 shrink-0"
				class:starred={isStarred(song)}
				type="button"
				aria-label={isStarred(song) ? 'Remove from favourites' : 'Add to favourites'}
				aria-pressed={isStarred(song)}
				onclick={() => toggleStar(song)}
			>
				<Icon name={isStarred(song) ? 'heart-filled' : 'heart'} class="size-5" />
			</button>
		</div>
		<Queue />
	</aside>
{/if}

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-height: 0;
		padding: 12px 16px 16px;
		overflow-y: auto;
		border-left: 1px solid var(--z-hairline);
		background: linear-gradient(color-mix(in oklab, var(--tint, var(--z-surface)) 22%, var(--z-surface)), var(--z-surface) 420px);
		outline: none;
	}
	/* It scrolls as a whole: nothing in it is squeezed to fit. */
	.panel > :global(*) {
		flex-shrink: 0;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	header .z-caption {
		margin: 0;
	}
	.panel :global(.art) {
		width: 100%;
		border-radius: 10px;
		box-shadow: var(--z-shadow-menu);
	}
	.about {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
	}
	h2 {
		margin: 0;
		color: var(--z-ink);
		font-size: 18px;
		font-weight: 650;
		line-height: 1.25;
	}
	p {
		margin: 2px 0 0;
		overflow: hidden;
		color: var(--z-muted);
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	a {
		color: inherit;
		text-decoration: none;
	}
	a:hover {
		color: var(--z-accent-ink);
		text-decoration: underline;
	}
	.starred {
		color: var(--z-ch-flagged-solid);
	}
</style>
