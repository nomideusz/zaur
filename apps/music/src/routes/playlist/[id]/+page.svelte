<script lang="ts">
	import { tick } from 'svelte';
	import { afterNavigate, invalidateAll } from '$app/navigation';
	import { api, post } from '#lib/api';
	import { notify } from '#lib/notice.svelte';
	import { formatTime, player } from '#lib/player.svelte';
	import { visit } from '#lib/visit.svelte';
	import Cover from '#lib/components/Cover.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import TrackList from '#lib/components/TrackList.svelte';

	let { data } = $props();
	const list = $derived(data.playlist);
	const songs = $derived(list.entry ?? []);
	// Navidrome lets only the owner change a playlist; one shared by someone else is read-only.
	const mine = $derived(list.owner === data.user.email);
	const url = $derived(`/api/playlist/${encodeURIComponent(list.id)}`);

	let sheet: Sheet;
	let name = $state('');
	let deleting = $state(false);
	let busy = $state(false);
	// Whether the history entry before this one is Playlists: come here from it, not Back to here.
	// (Opening the card is a navigation too, a shallow one, and says nothing about that.)
	let listBefore = false;
	afterNavigate(({ from, type, shallow }) => {
		if (!shallow) listBefore = type !== 'popstate' && from?.url.pathname === '/playlists';
	});

	function edit() {
		name = list.name;
		deleting = false;
		sheet.open();
	}

	// The card swaps its form for the question and back, and the button just pressed goes with
	// the half it was in: the card itself takes the focus, so the keys stay inside it.
	async function ask(sure: boolean) {
		deleting = sure;
		await tick();
		sheet.focus();
	}

	async function change(body: { name: string } | { remove: number }, done: string) {
		busy = true;
		const ok = await post(url, body);
		busy = false;
		// Waited for: the card's history entry going would cut the reload below short.
		await sheet.close();
		if (!ok) return notify('Could not change the playlist.');
		await invalidateAll();
		notify(done);
	}

	async function remove() {
		busy = true;
		const response = await api(url, { method: 'DELETE' }).catch(() => null);
		busy = false;
		await sheet.close();
		if (!response?.ok) return notify('Could not delete the playlist.');
		notify(`Deleted ${list.name}`);
		// Back would only find it gone. Step back to Playlists when that is the entry before this
		// one (replacing this one would put it in history twice); otherwise take this one's place.
		if (listBefore) history.back();
		else void visit('/playlists', { replace: true });
	}
</script>

<svelte:head><title>{list.name} · Zaur Music</title></svelte:head>

<div class="page">
	<header class="hero">
		<Cover id={list.coverArt} size={300} class="w-40 shrink-0 !rounded-xl" />
		<div class="min-w-0">
			<span class="z-caption">{mine ? 'Playlist' : 'Shared playlist'}</span>
			<h1>{list.name}</h1>
			<p class="z-caption">{songs.length} {songs.length === 1 ? 'song' : 'songs'} · {formatTime(list.duration)}</p>
			<div class="actions mt-3">
				<button class="btn-tactile btn-primary tall" type="button" disabled={!songs.length} onclick={() => player.play(songs)}>
					<Icon name="play" /> Play
				</button>
				<button class="btn-tactile tall" type="button" disabled={!songs.length} onclick={() => player.shuffle(songs)}>
					<Icon name="shuffle" /> Shuffle
				</button>
				{#if mine}<button class="btn-tactile tall" type="button" onclick={edit}>Edit</button>{/if}
			</div>
		</div>
	</header>
	{#if songs.length}
		<TrackList
			{songs}
			onremove={mine ? (index) => change({ remove: index }, `Removed from ${list.name}`) : undefined}
		/>
	{:else}
		<p class="empty-note">
			Nothing in this playlist yet.{#if mine}&nbsp;Add songs from the ⋯ menu beside them.{/if}
		</p>
	{/if}
</div>

<Sheet bind:this={sheet} label={deleting ? 'Delete this playlist?' : 'Edit playlist'} heading>
	{#if deleting}
		<p class="ask">“{list.name}” will be deleted. Its songs stay in the library.</p>
		<div class="actions justify-end">
			<button class="btn-tactile tall" type="button" onclick={() => ask(false)}>Cancel</button>
			<button class="btn-tactile btn-danger tall" type="button" disabled={busy} onclick={remove}>Delete</button>
		</div>
	{:else}
		<form class="flex flex-col gap-4" onsubmit={(event) => (event.preventDefault(), change({ name }, 'Renamed'))}>
			<input class="z-field" placeholder="Name" aria-label="Playlist name" maxlength="200" autocomplete="off" bind:value={name} />
			<div class="actions">
				<button class="btn-tactile btn-danger tall mr-auto" type="button" onclick={() => ask(true)}>Delete…</button>
				<button class="btn-tactile tall" type="button" onclick={() => sheet.close()}>Cancel</button>
				<button class="btn-tactile btn-primary tall" type="submit" disabled={busy || !name.trim() || name.trim() === list.name}>Save</button>
			</div>
		</form>
	{/if}
</Sheet>

<style>
	.hero {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 20px;
		margin-bottom: 24px;
	}
	h1 {
		margin: 0;
		color: var(--z-ink);
		font-size: clamp(22px, 4vw, 32px);
		font-weight: 700;
		line-height: 1.15;
	}
	p {
		margin: 4px 0 0;
	}
	.ask {
		margin: 0 0 16px;
	}
</style>
