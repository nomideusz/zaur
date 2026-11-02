<script lang="ts">
	import { BIRD } from '#lib/bird';

	/**
	 * Zaur's bird, drawn inline (traced by scripts/zaur-bird.py, so it needs no
	 * request and shows even offline). In its colours where it stands for Zaur;
	 * `mono` is its silhouette in the current ink, for a row of one-colour glyphs.
	 * It is wider than tall: size it by width.
	 */
	let { class: className = 'w-5', mono = false }: { class?: string; mono?: boolean } = $props();
</script>

<svg class="shrink-0 {className}" viewBox="0 0 {BIRD.width} {BIRD.height}" aria-hidden="true">
	{#if mono}
		<path fill="currentColor" fill-rule="evenodd" d={BIRD.silhouette} />
	{:else}
		<!-- Each colour's own stroke closes the hairline seams between neighbouring polygons. -->
		{#each BIRD.shapes as [colour, d] (colour)}
			<path fill={colour} stroke={colour} stroke-width="2" stroke-linejoin="round" fill-rule="evenodd" {d} />
		{/each}
	{/if}
</svg>
