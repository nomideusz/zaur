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
	 */
	let { track, class: className = '' }: { track: Track; class?: string } = $props();

	const current = $derived(track);
	let element = $state<HTMLMediaElement>();

	$effect(() => {
		const node = element;
		const t = current;
		if (!node) return;
		t.attach(node);
		return () => void t.detach(node);
	});
</script>

{#if current.kind === 'audio'}
	<audio bind:this={element}></audio>
{:else}
	<video bind:this={element} class={className}></video>
{/if}
