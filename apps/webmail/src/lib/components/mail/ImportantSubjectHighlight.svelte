<script lang="ts">
	import { browser } from '$app/environment';
	import { tick } from 'svelte';
	import { annotate } from 'rough-notation';
	import { importantMarker } from '$lib/mail/important-marker.svelte';
	import { IMPORTANT_MARKER_TEXT, markerHighlightColor } from '$lib/mail/important-marker-colors';
	import { cn } from '$lib/utils/cn';

	type RoughAnnotation = ReturnType<typeof annotate>;

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

	const hueShift = $derived.by(() => {
		void importantMarker.picked;
		void importantMarker.pickingShift;
		void importantMarker.pickingMessageId;
		if (picking && importantMarker.pickingMessageId === messageId) {
			return importantMarker.pickingShift;
		}
		return importantMarker.pickFor(messageId).hueShift;
	});

	const color = $derived(
		markerHighlightColor(importantMarker.baseHue(messageId) + hueShift)
	);

	function annotationConfig(currentColor: string) {
		const shouldAnimate = animate && !importantMarker.hasPicked(messageId);
		return {
			type: 'highlight' as const,
			color: currentColor,
			padding: 5,
			strokeWidth: 1.5,
			iterations: 2,
			multiline: true,
			animationDuration: shouldAnimate ? 700 : 0
		};
	}

	$effect(() => {
		if (!browser || !target) return;

		const el = target;
		void messageId;
		const initialColor = color;

		let ann: RoughAnnotation | null = null;
		let cancelled = false;
		let frameId = 0;

		void (async () => {
			await tick();
			if (cancelled || !el.isConnected) return;
			frameId = requestAnimationFrame(() => {
				if (cancelled || !el.isConnected) return;
				ann = annotate(el, annotationConfig(initialColor));
				annotation = ann;
				ann.show();
			});
		})();

		return () => {
			cancelled = true;
			cancelAnimationFrame(frameId);
			ann?.remove();
			annotation = null;
		};
	});

	$effect(() => {
		if (!annotation) return;
		const currentColor = color;
		if (annotation.color !== currentColor) {
			annotation.color = currentColor;
		}
	});
</script>

<!-- Positioning context for rough-notation SVG (inserted as sibling before the target span). -->
<span class="relative inline max-w-full">
	<span
		bind:this={target}
		data-important-subject={messageId}
		class={cn('z-important-subject pointer-events-none relative inline font-semibold', className)}
		style:color={IMPORTANT_MARKER_TEXT}
	>
		{@render children?.()}
	</span>
</span>
