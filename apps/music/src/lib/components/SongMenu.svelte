<script lang="ts">
	import { notify } from '#lib/notice.svelte';
	import { player } from '#lib/player.svelte';
	import type { Song } from '#lib/types';
	import Icon from './Icon.svelte';
	import PlaylistPicker from './PlaylistPicker.svelte';
	import Sheet from './Sheet.svelte';

	/**
	 * A track row's "more" menu: queue it, file it in a playlist, go to where it
	 * came from. `album` is off on the album's own page; `onremove` adds "Remove
	 * from playlist" (the playlist page passes it for a playlist you own).
	 */
	let { album = true, onremove }: { album?: boolean; onremove?: (index: number, keyboard: boolean) => void } = $props();
	let sheet: Sheet;
	let picker: PlaylistPicker;
	let song = $state<Song>();
	let index = 0;

	export function open(row: Song, at: number, button: HTMLElement): void {
		song = row;
		index = at;
		sheet.open(button);
	}

	function queue(next: boolean) {
		if (next) player.playNext(song!);
		else player.append(song!);
		sheet.close();
		notify(next ? 'Plays next' : 'Added to queue');
	}
</script>

<Sheet bind:this={sheet} label="Song actions">
	{#if song}
		<p class="about">
			<span class="truncate font-semibold text-[var(--z-ink)]">{song.title}</span>
			<span class="z-caption truncate">{song.artist ?? ''}</span>
		</p>
		<button class="z-menu-item" type="button" onclick={() => queue(true)}><Icon name="next" /> Play next</button>
		<button class="z-menu-item" type="button" onclick={() => queue(false)}><Icon name="plus" /> Add to queue</button>
		<button class="z-menu-item" type="button" onclick={() => (sheet.close(), picker.open([song!]))}>
			<Icon name="playlist" /> Add to playlist…
		</button>
		<!-- The menu closes when a link's page is had, and then it is gone to (see Sheet). -->
		{#if album && song.albumId}
			<a class="z-menu-item" href="/album/{song.albumId}"><Icon name="album" /> Go to album</a>
		{/if}
		{#if song.artistId}
			<a class="z-menu-item" href="/artist/{song.artistId}"><Icon name="artist" /> Go to artist</a>
		{/if}
		{#if onremove}
			<!-- detail is 0 for a click that was a key press. -->
			<button class="z-menu-item" type="button" onclick={async ({ detail }) => (await sheet.close(), onremove(index, detail === 0))}>
				<Icon name="close" /> Remove from playlist
			</button>
		{/if}
	{/if}
</Sheet>
<PlaylistPicker bind:this={picker} />

<style>
	a {
		text-decoration: none;
	}
	/* Which song this is: the sheet on a phone sits away from its row. */
	.about {
		display: none;
		flex-direction: column;
		margin: 0 0 6px;
		padding: 8px 9px 10px;
		border-bottom: 1px solid var(--z-hairline);
	}
	@media (max-width: 640px) {
		.about {
			display: flex;
		}
	}
	@media (pointer: coarse) {
		.z-menu-item {
			min-height: 44px;
			font-size: 14px;
		}
	}
</style>
