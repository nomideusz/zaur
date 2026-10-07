<script lang="ts">
	// A peek strip: the project's real screens inside its node. On a mouse the
	// pointer's x position scrubs through the frames like a filmstrip; on touch
	// the strip swipes with scroll snap. Any click opens the Look inside dialog,
	// and the active frame morphs into it (View Transitions, see +page.svelte).
	import type { Plates } from '$lib/plates';

	let {
		plates,
		name,
		morph = null,
		onopen
	}: {
		plates: Plates;
		name: string;
		/** While a morph to or from the dialog runs, the frame that carries the shared name. */
		morph?: number | null;
		onopen: (frame: number) => void;
	} = $props();

	// The strip shows chosen details when the project has them, else whole screens.
	// Either way frame k of the strip is page k of the dialog.
	const strip = $derived(plates.fragments?.length ? plates.fragments : plates.frames);
	const wide = (f: { w: number; h: number }) => f.w / f.h > 1.9;

	let i = $state(0);
	let film = $state<HTMLElement>();
	const n = $derived(strip.length);
	const touch = $derived(typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches);

	$effect(() => {
		if (morph !== null) i = morph;
	});

	function scrub(e: PointerEvent) {
		if (e.pointerType !== 'mouse' || n < 2) return;
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		i = Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * n)));
	}

	// On touch the film scrolls; the dots follow the frame that snapped into view.
	function followScroll() {
		if (film && touch) i = Math.round(film.scrollLeft / film.clientWidth);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions (scrubbing is a pointer-only extra; the button below is the control) -->
<div class="peek" style:--n={n} style:--i={i} onpointermove={scrub} onpointerleave={() => morph === null && (i = 0)}>
	<div class="peek__film" bind:this={film} onscroll={followScroll}>
		{#each strip as f, k (f.src)}
			<div class="peek__frame">
				<img
					src={f.src}
					width={f.w}
					height={f.h}
					alt={f.alt}
					loading="lazy"
					decoding="async"
					draggable="false"
					style:object-fit={wide(f) ? 'contain' : 'cover'}
					style:object-position={wide(f) ? 'center' : 'top'}
					style:view-transition-name={morph !== null && k === i ? 'plate' : null}
				/>
			</div>
		{/each}
	</div>
	{#if n > 1}
		<span class="peek__dots" aria-hidden="true">
			{#each strip as f, k (f.src)}<i class:on={k === i}></i>{/each}
		</span>
	{/if}
	<button type="button" class="peek__open" onclick={() => onopen(i)} aria-label="Look inside {name}: {n} {n === 1 ? 'screen' : 'screens'}">
		<span class="peek__cta">Look inside</span>
	</button>
</div>
