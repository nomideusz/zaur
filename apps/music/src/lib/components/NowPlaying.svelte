<script lang="ts">
	import { notice } from '#lib/notice.svelte';
	import { formatTime, isStarred, player, toggleStar } from '#lib/player.svelte';
	import type { Song } from '#lib/types';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';

	/**
	 * Now playing: the big cover, the scrubber, and the queue beneath. A sheet
	 * over everything on a phone, a panel over the page on a wide screen. A
	 * native modal dialog, so focus moves in, stays in and goes back to the
	 * opener, and Esc closes; `player.open` is a history entry, so Back does too.
	 */
	const song = $derived(player.current);
	const close = () => (player.open = false);
	let dialog = $state<HTMLDialogElement>();
	// While the thumb is held the slider shows where it is; the audio seeks once, on release.
	let drag = $state<number>();
	const shown = $derived(drag ?? player.time);
	const repeatLabel = $derived(`Repeat: ${{ off: 'off', all: 'all', one: 'this song' }[player.repeat]}`);

	$effect(() => {
		if (!dialog) return;
		if (player.open && song) {
			if (!dialog.open) dialog.showModal();
		} else if (dialog.open) dialog.close();
	});
</script>

{#snippet row(item: Song, i: number)}
	<li>
		<button class="row" type="button" onclick={() => player.jump(i)}>
			<Cover id={item.coverArt} size={96} class="w-9 shrink-0 !rounded-md" />
			<span class="text">
				<span class="title">{item.title}</span>
				<span class="meta">{item.artist ?? ''}</span>
			</span>
		</button>
		<button class="z-icon-btn !size-8 pointer-coarse:!size-10" type="button" aria-label="Remove from queue" onclick={() => player.remove(i)}>
			<Icon name="close" class="size-3.5" />
		</button>
	</li>
{/snippet}

<!-- A click that lands on the dialog itself is on the backdrop: everything inside is covered by its children. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} class="sheet" aria-label="Now playing" onclose={close} onclick={(event) => event.target === dialog && close()}>
	{#if player.open && song}
		<header>
			<button class="z-icon-btn !size-9 pointer-coarse:!size-11" type="button" aria-label="Close" onclick={close}>
				<Icon name="chevron-down" class="size-5" />
			</button>
			<span class="z-caption">Now playing</span>
			<span class="w-9 pointer-coarse:w-11"></span>
		</header>

		<div class="body">
			<div class="stage">
				<Cover id={song.coverArt} size={600} class="art" />
				<div class="controls">
					<div class="about">
						<div class="min-w-0">
							<h2>{song.title}</h2>
							<!-- replacestate: the page takes the sheet's history entry, so Back does not reopen it. -->
							<p>
								{#if song.artistId}<a href="/artist/{song.artistId}" data-sveltekit-replacestate>{song.artist}</a>{:else}{song.artist ?? ''}{/if}
								{#if song.album}
									· {#if song.albumId}<a href="/album/{song.albumId}" data-sveltekit-replacestate>{song.album}</a>{:else}{song.album}{/if}
								{/if}
							</p>
						</div>
						<button
							class="z-icon-btn !size-9 shrink-0 pointer-coarse:!size-11"
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
						value={shown}
						aria-label="Position"
						aria-valuetext="{formatTime(shown)} of {formatTime(player.duration)}"
						oninput={(event) => (drag = Number(event.currentTarget.value))}
						onchange={(event) => {
							player.seek(Number(event.currentTarget.value));
							drag = undefined;
						}}
						onpointerup={() => setTimeout(() => (drag = undefined))}
					/>
					<div class="times z-mono">
						<span>{formatTime(shown)}</span>
						<span>{formatTime(player.duration)}</span>
					</div>

					<div class="transport">
						<button
							class="z-icon-btn !size-10"
							class:on={player.shuffling}
							type="button"
							aria-label="Shuffle"
							aria-pressed={player.shuffling}
							title="Shuffle what's next"
							onclick={() => player.toggleShuffle()}
						>
							<Icon name="shuffle" class="size-[18px]" />
						</button>
						<button class="z-icon-btn !size-12" type="button" aria-label="Previous" onclick={() => player.previous()}>
							<Icon name="prev" class="size-5" />
						</button>
						<button
							class="play"
							class:waiting={player.waiting}
							type="button"
							aria-label={player.playing ? 'Pause' : 'Play'}
							aria-busy={player.waiting}
							onclick={() => player.toggle()}
						>
							<Icon name={player.playing ? 'pause' : 'play'} class="size-6" />
						</button>
						<button class="z-icon-btn !size-12" type="button" aria-label="Next" disabled={!player.hasNext} onclick={() => player.next()}>
							<Icon name="next" class="size-5" />
						</button>
						<button
							class="z-icon-btn !size-10"
							class:on={player.repeat !== 'off'}
							type="button"
							aria-label={repeatLabel}
							title={repeatLabel}
							onclick={() => player.cycleRepeat()}
						>
							<Icon name={player.repeat === 'one' ? 'repeat-one' : 'repeat'} class="size-[18px]" />
						</button>
					</div>
				</div>
			</div>

			<section class="queue">
				{#if player.index > 0}
					<details class="played">
						<summary class="z-caption">Played · {player.index}</summary>
						<ol>
							{#each player.queue as item, i (`${item.id}-${i}`)}
								{#if i < player.index}{@render row(item, i)}{/if}
							{/each}
						</ol>
					</details>
				{/if}
				<div class="queue-head">
					<h3 class="z-caption">Up next</h3>
					{#if player.index < player.queue.length - 1}
						<button class="clear" type="button" onclick={() => player.clear()}>Clear</button>
					{/if}
				</div>
				{#if player.index >= player.queue.length - 1}
					<p class="empty">Nothing after this one.</p>
				{/if}
				<ol>
					{#each player.queue as item, i (`${item.id}-${i}`)}
						{#if i > player.index}{@render row(item, i)}{/if}
					{/each}
				</ol>
			</section>
		</div>

		<!-- The layout's status line is under this sheet (a modal dialog is above everything), so it is said here too. -->
		<div class="notice" role="status">
			{#if notice.text}<p class="z-railed">{notice.text}</p>{/if}
		</div>
	{/if}
</dialog>

<style>
	.sheet {
		inset: 0;
		width: auto;
		max-width: none;
		height: auto;
		max-height: none;
		margin: 0;
		padding: 0 0 env(safe-area-inset-bottom);
		border: 0;
		flex-direction: column;
		background: var(--z-surface);
		color: inherit;
	}
	/* Not on .sheet: that would show the closed dialog. */
	.sheet[open] {
		display: flex;
	}
	.sheet::backdrop {
		background: var(--z-scrim);
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
		grid-template-columns: minmax(0, 1fr);
		align-content: start;
		gap: 24px;
		min-height: 0;
		padding: 8px 24px 24px;
		overflow-y: auto;
	}
	.stage {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 420px;
		margin: 0 auto;
	}
	/* The cover is what gives: the title, scrubber and transport stay on the first screen. */
	.stage :global(.art) {
		align-self: center;
		width: min(100%, 40dvh);
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
	h2,
	.about p {
		display: -webkit-box;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
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
		justify-content: space-between;
		max-width: 340px;
		margin: 10px auto 0;
	}
	.on {
		color: var(--z-accent-ink);
	}
	.play {
		position: relative;
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
	/* Loading or buffering: a ring turns around the button (after a beat, so a quick start shows nothing). */
	.play::after {
		content: '';
		position: absolute;
		inset: -6px;
		border: 2px solid transparent;
		border-top-color: var(--z-accent);
		border-radius: inherit;
		opacity: 0;
	}
	.play.waiting::after {
		opacity: 1;
		transition: opacity 0.2s 0.3s;
		animation: turn 0.8s linear infinite;
	}
	@keyframes turn {
		to {
			transform: rotate(360deg);
		}
	}

	/* A wide, tall window: a panel over the page, the queue beside the cover. */
	@media (min-width: 900px) and (min-height: 501px) {
		.sheet {
			width: min(880px, 92vw);
			height: 90vh;
			margin: auto;
			border-radius: 14px;
			box-shadow: var(--z-shadow-panel);
			overflow: hidden;
		}
		.body {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			align-items: start;
		}
	}
	/* A phone on its side: the cover beside the controls, or they would be a screen down. */
	@media (orientation: landscape) and (max-height: 500px) {
		.stage {
			flex-direction: row;
			align-items: center;
			gap: 24px;
			max-width: 720px;
		}
		.stage :global(.art) {
			flex-shrink: 0;
			width: min(40%, 100dvh - 110px);
		}
		.controls {
			flex: 1;
			min-width: 0;
		}
		.about {
			margin-top: 0;
		}
	}

	.queue-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 28px;
	}
	.queue-head h3 {
		margin: 0;
	}
	.clear {
		padding: 4px 8px;
		border: 0;
		border-radius: 6px;
		background: none;
		color: var(--z-accent-ink);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.clear:hover {
		background: var(--z-hover);
	}
	.played {
		margin-bottom: 8px;
	}
	.played summary {
		padding: 4px 0;
		cursor: pointer;
	}
	/* Already heard: dimmed, still there to go back to. */
	.played li {
		opacity: 0.6;
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
		opacity: 1;
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
		margin: 6px 0 0;
		color: var(--z-soft);
	}

	/* The same status line as the layout's, along the sheet's bottom edge. */
	.notice {
		position: absolute;
		right: 12px;
		bottom: calc(16px + env(safe-area-inset-bottom));
		left: 12px;
		display: flex;
		justify-content: center;
		pointer-events: none;
	}
	.notice p {
		--z-rail: var(--z-accent);
		--z-rail-inset: 9px;
		max-width: 380px;
		margin: 0;
		padding: 9px 14px 9px 18px;
		border: 1px solid var(--z-line);
		border-radius: 10px;
		background: var(--z-surface);
		color: var(--z-body);
		font-size: 13px;
		font-weight: 500;
		box-shadow: var(--z-shadow-menu);
	}
</style>
