<script lang="ts">
	import { api, post, unreachable } from '#lib/api';
	import { notify } from '#lib/notice.svelte';
	import type { Playlist, Song } from '#lib/types';
	import Cover from './Cover.svelte';
	import Sheet from './Sheet.svelte';

	/** "Add to playlist…": pick one of your playlists, or name a new one. */
	let sheet: Sheet;
	let songs: Song[] = [];
	let lists = $state<Playlist[] | null>(null);
	let name = $state('');
	let busy = $state(false);

	export async function open(adding: Song[]): Promise<void> {
		songs = adding;
		lists = null;
		name = '';
		sheet.open();
		const response = await api('/api/playlists').catch(() => null);
		if (response?.ok) return void (lists = await response.json());
		// No answer is not "no playlists": say so, rather than show a card with none.
		void sheet.close();
		unreachable();
	}

	// Done or failed, the card closes and the status line says which.
	async function addTo(list: { id: string; name: string }) {
		busy = true;
		const ok = await post(`/api/playlist/${encodeURIComponent(list.id)}`, { add: songs.map((song) => song.id) });
		busy = false;
		sheet.close();
		notify(ok ? `Added to ${list.name}` : 'Could not add to the playlist.');
	}

	async function create(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		const response = await api('/api/playlists', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		}).catch(() => null);
		if (response?.ok) return addTo(await response.json());
		busy = false;
		sheet.close();
		notify('Could not make the playlist.');
	}
</script>

<Sheet bind:this={sheet} label="Add to playlist" heading>
	{#if !lists}
		<p class="z-caption note">Loading…</p>
	{:else}
		<div class="lists">
			{#each lists as list (list.id)}
				<button class="z-menu-item" type="button" disabled={busy} onclick={() => addTo(list)}>
					<Cover id={list.coverArt} size={96} class="w-8 shrink-0 !rounded-md" />
					<span class="truncate">{list.name}</span>
					<span class="z-caption count">{list.songCount ?? 0}</span>
				</button>
			{/each}
		</div>
		<!-- Here, not above the loading note: opened with only this field in it, the dialog
		     would focus it and raise a phone's keyboard over the list. -->
		<form onsubmit={create}>
			<input class="z-field" placeholder="New playlist" aria-label="New playlist name" maxlength="200" autocomplete="off" bind:value={name} />
			<button class="btn-tactile btn-primary tall" type="submit" disabled={busy || !name.trim()}>Create</button>
		</form>
	{/if}
</Sheet>

<style>
	.lists {
		max-height: min(320px, 45dvh);
		margin: 0 -8px;
		overflow-y: auto;
	}
	.lists button {
		min-height: 44px;
	}
	.count {
		margin-left: auto;
	}
	.note {
		margin: 0;
	}
	form {
		display: flex;
		gap: 8px;
		margin-top: 12px;
	}
	input {
		flex: 1;
		min-width: 0;
	}
</style>
