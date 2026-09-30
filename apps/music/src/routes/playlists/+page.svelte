<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '#lib/api';
	import { notify } from '#lib/notice.svelte';
	import { formatTime } from '#lib/player.svelte';
	import Cover from '#lib/components/Cover.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Sheet from '#lib/components/Sheet.svelte';

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
		sheet.close();
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
		<div class="album-grid">
			{#each data.playlists as list (list.id)}
				<a class="tile" href="/playlist/{list.id}">
					<Cover id={list.coverArt} class="mb-1.5" />
					<span class="truncate font-semibold text-[var(--z-ink)]">{list.name}</span>
					<span class="z-caption truncate">{list.songCount ?? 0} {list.songCount === 1 ? 'song' : 'songs'} · {formatTime(list.duration)}</span>
				</a>
			{/each}
		</div>
	{:else}
		<p class="empty-note">No playlists yet. Make one here, or from the ⋯ menu beside any song.</p>
	{/if}
</div>

<Sheet bind:this={sheet} label="New playlist" heading>
	<form class="flex flex-col gap-4" onsubmit={create}>
		<input class="z-field name" placeholder="Name" aria-label="Playlist name" maxlength="200" autocomplete="off" bind:value={name} />
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
	.name {
		height: 36px;
	}
	@media (pointer: coarse) {
		/* Under 16px, iOS zooms the page when the field takes focus. */
		.name {
			height: 44px;
			font-size: 16px;
		}
	}
</style>
