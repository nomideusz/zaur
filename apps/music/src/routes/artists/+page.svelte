<script lang="ts">
	import Cover from '#lib/components/Cover.svelte';
	import SearchField from '#lib/components/SearchField.svelte';

	let { data } = $props();
	let filter = $state('');
	// "laki" finds Łąki Łan: accents come off (ł has no accent to take off, so by hand).
	const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/gi, 'l').toLowerCase();
	const needle = $derived(fold(filter.trim()));
	const groups = $derived(
		data.index
			.map((group) => ({ ...group, artist: group.artist.filter((a) => fold(a.name).includes(needle)) }))
			.filter((group) => group.artist.length)
	);
</script>

<svelte:head><title>Artists · Zaur Music</title></svelte:head>

<div class="page">
	<header class="page-head">
		<h1>Artists</h1>
		<SearchField class="w-[min(280px,100%)]" placeholder="Filter artists" aria-label="Filter artists" bind:value={filter} />
	</header>

	{#each groups as group (group.name)}
		<section class="group">
			<h2 class="z-caption">{group.name}</h2>
			<div class="artists">
				{#each group.artist as artist (artist.id)}
					<a class="artist" href="/artist/{artist.id}">
						<Cover id={artist.coverArt} size={96} class="w-11 shrink-0 !rounded-full" />
						<span class="min-w-0">
							<span class="block truncate font-semibold text-[var(--z-ink)]">{artist.name}</span>
							<span class="z-caption">{artist.albumCount ?? 0} {artist.albumCount === 1 ? 'album' : 'albums'}</span>
						</span>
					</a>
				{/each}
			</div>
		</section>
	{:else}
		<p class="empty-note">No artists match.</p>
	{/each}
</div>

<style>
	.group {
		margin-bottom: 18px;
	}
	.group h2 {
		margin: 0 0 6px;
		padding: 0 8px;
	}
	.artists {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 2px 12px;
	}
	.artist {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 8px;
		border-radius: 10px;
		text-decoration: none;
	}
	.artist:hover {
		background: var(--z-hover);
	}
</style>
