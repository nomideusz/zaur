<script lang="ts">
	import { BIRD } from '#lib/bird';

	/**
	 * Zaur's mark, the bird (static/favicon.svg), as in Mail. Traced by
	 * apps/mail2/scripts/zaur-bird.py into #lib/bird; wider than tall, so it is
	 * sized by width.
	 */
	let { class: className = 'w-[30px]' }: { class?: string } = $props();
</script>

<svg class="shrink-0 {className}" viewBox="0 0 {BIRD.width} {BIRD.height}" aria-hidden="true">
	<!-- Each colour's own stroke closes the hairline seams between neighbouring polygons. -->
	{#each BIRD.shapes as [colour, d] (colour)}
		<path fill={colour} stroke={colour} stroke-width="2" stroke-linejoin="round" fill-rule="evenodd" {d} />
	{/each}
</svg>
