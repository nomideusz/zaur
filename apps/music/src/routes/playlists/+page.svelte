<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '#lib/api';
	import { notify } from '#lib/notice.svelte';
	import { formatTime } from '#lib/player.svelte';
	import Cover from '#lib/components/Cover.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import type { Playlist } from '#lib/types';

	let { data } = $props();
	let sheet: Sheet;
	let name = $state('');
	let busy = $state(false);

	async function create(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		const response = await api('/api/playlists', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		}).catch(() => null);
		busy = false;
		// Waited for: the card's history entry going would cut the navigation below short.
		await sheet.close();
		if (!response?.ok) return notify('Could not make the playlist.');
		goto(`/playlist/${encodeURIComponent((await response.json()).id)}`);
	}
</script>

<svelte:head><title>Playlists · Zaur Music</title></svelte:head>

<div class="page">
	<header class="page-head">
		<h1>Playlists</h1>
		<button class="btn-tactile tall" type="button" onclick={() => ((name = ''), sheet.open())}><Icon name="plus" /> New playlist</button>
	</header>
	{#if data.playlists.length}
		{@render grid(data.playlists)}
	{:else}
		<p class="empty-note">No playlists yet. Make one here, or from the ⋯ menu beside any song.</p>
	{/if}
	<!-- Not yours: another account made these public. They play, and only their owner changes them. -->
	{#if data.shared.length}
		<section class="section">
			<div class="section-head"><h2>Shared by others</h2></div>
			{@render grid(data.shared, true)}
		</section>
	{/if}
</div>

{#snippet grid(lists: Playlist[], shared = false)}
	<div class="album-grid">
		{#each lists as list (list.id)}
			<a class="tile" href="/playlist/{list.id}">
				<Cover id={list.coverArt} class="mb-1.5" />
				<span class="truncate font-semibold text-[var(--z-ink)]">{list.name}</span>
				<span class="z-caption truncate">
					{list.songCount ?? 0} {list.songCount === 1 ? 'song' : 'songs'} · {shared && list.owner ? `by ${list.owner}` : formatTime(list.duration)}
				</span>
			</a>
		{/each}
	</div>
{/snippet}

<Sheet bind:this={sheet} label="New playlist" heading>
	<form class="flex flex-col gap-4" onsubmit={create}>
		<input class="z-field" placeholder="Name" aria-label="Playlist name" maxlength="200" autocomplete="off" bind:value={name} />
		<div class="actions justify-end">
			<button class="btn-tactile tall" type="button" onclick={() => sheet.close()}>Cancel</button>
			<button class="btn-tactile btn-primary tall" type="submit" disabled={busy || !name.trim()}>Create</button>
		</div>
	</form>
</Sheet>

<style>
	.tile {
		display: flex;
		flex-direction: column;
		min-width: 0;
		text-decoration: none;
	}
</style>
