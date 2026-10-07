<script lang="ts">
	// svelte-geometrize's node runs the package on one of the canvas's own
	// plates: triangles fitted at build time resolve into the photo, the way
	// listing heroes load on szkolyjogi.pl. Pointing at the band replays it.
	import { GeometrizedImage } from '@nomideusz/svelte-geometrize';
	import placeholder from './plates/thebest-1.webp?shapes=120&preset=triangles&geometrize';
	import src from './plates/thebest-1.webp';

	let take = $state(0);
	const replay = () => take++;
</script>

<!-- svelte-ignore a11y_no_static_element_interactions (replaying on hover is a pointer-only extra; the button below is the control) -->
<div class="peek peek--geo" onpointerenter={replay}>
	{#key take}
		<GeometrizedImage
			{placeholder}
			{src}
			alt="thebest.travel's Kraków hero, resolving from triangles into the photo."
			revealMs={1500}
			objectFit="cover"
			objectPosition="top"
			loading="lazy"
		/>
	{/key}
	<button type="button" class="peek__badge peek__badge--btn" onclick={replay}>Replay the reveal</button>
</div>
