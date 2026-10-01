<script lang="ts">
	import { tick } from 'svelte';
	import { player } from '#lib/player.svelte';
	import type { Song } from '#lib/types';
	import Cover from './Cover.svelte';
	import Icon from './Icon.svelte';

	/**
	 * What comes next, and what came before (folded): in Now playing, and in the
	 * panel beside the page on a wide screen. A control that goes away with what
	 * it did (a row, Clear) would drop the focus onto the page: the nearest
	 * focusable box around the list takes it back.
	 */
	let section = $state<HTMLElement>();
	/** The songs before this one are folded away until asked for. */
	let earlier = $state(false);
	const home = () => section?.closest<HTMLElement>('[tabindex="-1"]');

	async function settle() {
		await tick();
		if (!home()?.contains(document.activeElement)) home()?.focus();
	}
	async function remove(button: HTMLElement, i: number) {
		// From the keyboard the focus stays in place, on the song that moves up; after a tap that would only draw a ring.
		const list = button.matches(':focus-visible') ? button.closest('ol') : null;
		const at = list ? [...list.children].indexOf(button.parentElement!) : 0;
		player.remove(i);
		await tick();
		const next = list?.children[Math.min(at, list.children.length - 1)]?.querySelector<HTMLElement>('.z-icon-btn');
		(next ?? home())?.focus();
	}
</script>

{#snippet row(item: Song, i: number)}
	<li>
		<button class="row" type="button" onclick={() => (player.jump(i), settle())}>
			<Cover id={item.coverArt} size={96} class="w-9 shrink-0 !rounded-md" />
			<span class="text">
				<span class="title">{item.title}</span>
				<span class="meta">{item.artist ?? ''}</span>
			</span>
		</button>
		<button
			class="z-icon-btn !size-8 pointer-coarse:!size-11"
			type="button"
			aria-label="Remove from queue"
			onclick={(event) => remove(event.currentTarget, i)}
		>
			<Icon name="close" class="size-3.5" />
		</button>
	</li>
{/snippet}

<section class="queue" bind:this={section}>
	{#if player.index > 0}
		<!-- "Earlier", not "Played": starting an album at its fourth song puts three before it unheard. -->
		<button class="fold z-caption" type="button" aria-expanded={earlier} onclick={() => (earlier = !earlier)}>
			<Icon name={earlier ? 'chevron-down' : 'chevron-right'} class="size-3" />
			Earlier · {player.index}
		</button>
		{#if earlier}
			<ol class="earlier">
				{#each player.queue as item, i (`${item.id}-${i}`)}
					{#if i < player.index}{@render row(item, i)}{/if}
				{/each}
			</ol>
		{/if}
	{/if}
	<div class="queue-head">
		<h3 class="z-caption">Up next</h3>
		{#if player.index < player.queue.length - 1}
			<button class="clear" type="button" onclick={() => (player.clear(), settle())}>Clear</button>
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

<style>
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
	.fold {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px 4px 0;
		border: 0;
		border-radius: 6px;
		background: none;
		cursor: pointer;
	}
	@media (pointer: coarse) {
		.clear,
		.fold {
			min-height: 44px;
		}
	}
	/* Behind the listener: quieter, still there to go back to (and still readable). */
	.queue .earlier {
		margin: 0 0 8px;
	}
	.earlier .title {
		color: var(--z-muted);
		font-weight: 400;
	}
	.earlier :global(.cover) {
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
	@media (hover: hover) {
		.queue li:hover {
			background: var(--z-hover);
		}
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
</style>
