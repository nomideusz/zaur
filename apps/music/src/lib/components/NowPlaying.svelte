<script lang="ts">
	import { formatTime, isStarred, player, toggleStar } from '#lib/player.svelte';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';

	/**
	 * Now playing: the big cover, the scrubber, and the queue beneath. A sheet
	 * over everything on a phone, a panel over the page on a wide screen.
	 */
	const song = $derived(player.current);
	const close = () => (player.open = false);
</script>

<svelte:window onkeydown={(event) => player.open && event.key === 'Escape' && close()} />

{#if player.open && song}
	<div class="scrim" role="presentation" onclick={close}></div>
	<div class="sheet" role="dialog" aria-modal="true" aria-label="Now playing">
		<header>
			<button class="z-icon-btn !size-9" type="button" aria-label="Close" onclick={close}>
				<Icon name="chevron-down" class="size-5" />
			</button>
			<span class="z-caption">Now playing</span>
			<span class="w-9"></span>
		</header>

		<div class="body">
			<div class="stage">
				<Cover id={song.coverArt} size={600} class="art" />
				<div class="about">
					<div class="min-w-0">
						<h2>{song.title}</h2>
						<p>
							{#if song.artistId}<a href="/artist/{song.artistId}" onclick={close}>{song.artist}</a>{:else}{song.artist ?? ''}{/if}
							{#if song.album}
								· {#if song.albumId}<a href="/album/{song.albumId}" onclick={close}>{song.album}</a>{:else}{song.album}{/if}
							{/if}
						</p>
					</div>
					<button
						class="z-icon-btn !size-9"
						class:starred={isStarred(song)}
						type="button"
						aria-label={isStarred(song) ? 'Remove from favourites' : 'Add to favourites'}
						aria-pressed={isStarred(song)}
						onclick={() => toggleStar(song)}
					>
						<Icon name={isStarred(song) ? 'heart-filled' : 'heart'} class="size-5" />
					</button>
				</div>

				<input
					class="scrub"
					type="range"
					min="0"
					max={player.duration || 0}
					step="1"
					value={player.time}
					aria-label="Position"
					oninput={(event) => player.seek(Number(event.currentTarget.value))}
				/>
				<div class="times z-mono">
					<span>{formatTime(player.time)}</span>
					<span>{formatTime(player.duration)}</span>
				</div>

				<div class="transport">
					<button class="z-icon-btn !size-12" type="button" aria-label="Previous" onclick={() => player.prev()}>
						<Icon name="prev" class="size-5" />
					</button>
					<button class="play" type="button" aria-label={player.playing ? 'Pause' : 'Play'} onclick={() => player.toggle()}>
						<Icon name={player.playing ? 'pause' : 'play'} class="size-6" />
					</button>
					<button class="z-icon-btn !size-12" type="button" aria-label="Next" onclick={() => player.next()}>
						<Icon name="next" class="size-5" />
					</button>
				</div>
			</div>

			<section class="queue">
				<h3 class="z-caption">Up next</h3>
				{#if player.index >= player.queue.length - 1}
					<p class="empty">Nothing after this one.</p>
				{/if}
				<ol>
					{#each player.queue as item, i (`${item.id}-${i}`)}
						{#if i > player.index}
							<li>
								<button class="row" type="button" onclick={() => player.jump(i)}>
									<Cover id={item.coverArt} size={96} class="w-9 shrink-0 !rounded-md" />
									<span class="text">
										<span class="title">{item.title}</span>
										<span class="meta">{item.artist ?? ''}</span>
									</span>
								</button>
								<button class="z-icon-btn !size-8" type="button" aria-label="Remove from queue" onclick={() => player.remove(i)}>
									<Icon name="close" class="size-3.5" />
								</button>
							</li>
						{/if}
					{/each}
				</ol>
			</section>
		</div>
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: var(--z-scrim-z);
		background: var(--z-scrim);
	}
	.sheet {
		position: fixed;
		inset: 0;
		z-index: var(--z-panel);
		display: flex;
		flex-direction: column;
		background: var(--z-surface);
		padding-bottom: env(safe-area-inset-bottom);
	}
	@media (min-width: 900px) {
		.sheet {
			inset: 5vh auto 5vh 50%;
			width: min(880px, 92vw);
			transform: translateX(-50%);
			border-radius: 14px;
			box-shadow: var(--z-shadow-panel);
			overflow: hidden;
		}
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: calc(8px + env(safe-area-inset-top)) 12px 8px;
	}
	.body {
		display: grid;
		flex: 1;
		gap: 24px;
		min-height: 0;
		padding: 8px 24px 24px;
		overflow-y: auto;
	}
	@media (min-width: 900px) {
		.body {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			align-items: start;
		}
	}
	.stage {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 420px;
		margin: 0 auto;
	}
	.stage :global(.art) {
		width: 100%;
		border-radius: 12px;
		box-shadow: var(--z-shadow-menu);
	}
	.about {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		margin-top: 20px;
	}
	h2 {
		margin: 0;
		color: var(--z-ink);
		font-size: 20px;
		font-weight: 650;
		line-height: 1.25;
	}
	.about p {
		margin: 4px 0 0;
		color: var(--z-muted);
	}
	.about a {
		color: inherit;
		text-decoration: none;
	}
	.about a:hover {
		color: var(--z-accent-ink);
		text-decoration: underline;
	}
	.starred {
		color: var(--z-ch-flagged-solid);
	}
	.scrub {
		width: 100%;
		margin-top: 18px;
		accent-color: var(--z-accent);
	}
	.times {
		display: flex;
		justify-content: space-between;
		color: var(--z-soft);
		font-size: 12px;
	}
	.transport {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 20px;
		margin-top: 10px;
	}
	.play {
		display: grid;
		place-items: center;
		width: 64px;
		height: 64px;
		border: 1px solid var(--z-accent-edge);
		border-radius: 999px;
		background: var(--z-accent);
		color: var(--z-accent-fg);
		box-shadow: var(--z-shadow-primary);
		cursor: pointer;
	}
	.queue ol {
		margin: 6px 0 0;
		padding: 0;
		list-style: none;
	}
	.queue li {
		display: flex;
		align-items: center;
		border-radius: 10px;
	}
	.queue li:hover {
		background: var(--z-hover);
	}
	.row {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 10px;
		min-width: 0;
		padding: 6px 8px;
		border: 0;
		background: none;
		text-align: left;
		cursor: pointer;
	}
	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.title,
	.meta {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.title {
		color: var(--z-ink);
		font-weight: 500;
	}
	.meta {
		color: var(--z-soft);
		font-size: 12.5px;
	}
	.empty {
		color: var(--z-soft);
	}
</style>
