<script lang="ts">
	import { browser } from '$app/environment';
	import { annotate } from 'rough-notation';

	type RoughAnnotation = ReturnType<typeof annotate>;
	import { importantMarker } from '$lib/mail/important-marker.svelte';
	import { IMPORTANT_MARKER_TEXT, markerHighlightColor } from '$lib/mail/important-marker-colors';
	import { cn } from '$lib/utils/cn';

	interface Props {
		messageId: string;
		picking?: boolean;
		animate?: boolean;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		messageId,
		picking = false,
		animate = true,
		class: className = '',
		children
	}: Props = $props();

	let target = $state<HTMLElement | null>(null);
	let annotation = $state<RoughAnnotation | null>(null);

	const hueShift = $derived(
		picking ? importantMarker.liveShiftFor(messageId) : importantMarker.pickFor(messageId).hueShift
	);

	const color = $derived(
		markerHighlightColor(importantMarker.baseHue(messageId) + hueShift)
	);

	function draw(animated: boolean) {
		if (!browser || !target) return;
		annotation?.remove();
		const next = annotate(target, {
			type: 'highlight',
			color,
			padding: 5,
			strokeWidth: 1.5,
			iterations: 2,
			multiline: true,
			animationDuration: animated ? 700 : 0
		});
		annotation = next;
		next.show();
	}

	$effect(() => {
		if (!browser || !target) return;
		void color;
		void picking;
		draw(picking || (animate && !importantMarker.hasPicked(messageId)));

		const ro = new ResizeObserver(() => draw(false));
		ro.observe(target);
		return () => {
			ro.disconnect();
			annotation?.remove();
		};
	});
</script>

<span
	bind:this={target}
	data-important-subject={messageId}
	class={cn('z-important-subject relative z-0 font-semibold', className)}
	style:color={IMPORTANT_MARKER_TEXT}
>
	{@render children?.()}
</span>
