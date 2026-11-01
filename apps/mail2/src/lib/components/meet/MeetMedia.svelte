<script lang="ts">
	import type { Track } from 'livekit-client';

	/**
	 * One LiveKit track on one element. `attach(el)` sets `muted`, `autoplay`
	 * and `playsInline` itself, per browser — never override them afterwards;
	 * that is what black-screened Android in webmail.
	 *
	 * The room rebuilds its roster on every event, so the track prop is handed
	 * in again and again. Held in a derived, the same track is not a change,
	 * and the element is not detached and re-attached (a black frame) each time.
	 *
	 * `fit="auto"` fills the box when the picture is roughly its shape, and
	 * shows all of it when it is not: a laptop's landscape picture on an upright
	 * phone, filled, would keep only the middle third of the face.
	 */
	let { track, class: className = '', fit = 'class' }: { track: Track; class?: string; fit?: 'class' | 'auto' } = $props();

	const current = $derived(track);
	let element = $state<HTMLMediaElement>();
	let picture = $state(0);
	let boxW = $state(0);
	let boxH = $state(0);
	const objectFit = $derived(
		fit !== 'auto' || !picture || !boxW || !boxH
			? undefined
			: Math.max(picture, boxW / boxH) / Math.min(picture, boxW / boxH) > 1.35
				? 'contain'
				: 'cover'
	);

	$effect(() => {
		const node = element;
		const t = current;
		if (!node) return;
		t.attach(node);
		return () => void t.detach(node);
	});

	function measure(event: Event) {
		const video = event.currentTarget as HTMLVideoElement;
		picture = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 0;
	}
</script>

{#if current.kind === 'audio'}
	<audio bind:this={element}></audio>
{:else}
	<video
		bind:this={element}
		bind:clientWidth={boxW}
		bind:clientHeight={boxH}
		class={className}
		style:object-fit={objectFit}
		onloadedmetadata={measure}
		onresize={measure}
	></video>
{/if}
