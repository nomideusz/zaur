<script lang="ts">
	import { coverUrl } from '#lib/player.svelte';
	import Icon from './Icon.svelte';

	/** Artwork, square, with a note glyph when there is none (or it fails). */
	let { id, size = 300, class: className = '' }: { id?: string; size?: number; class?: string } = $props();
	let failed = $state(false);
	const src = $derived(failed ? undefined : coverUrl(id, size));
</script>

<span class="cover {className}">
	{#if src}
		<img {src} alt="" loading="lazy" decoding="async" onerror={() => (failed = true)} />
	{:else}
		<Icon name="note" class="size-[40%] text-[var(--z-faint)]" />
	{/if}
</span>

<style>
	.cover {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: 8px;
		background: var(--z-sunken);
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--z-ink) 6%, transparent);
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
