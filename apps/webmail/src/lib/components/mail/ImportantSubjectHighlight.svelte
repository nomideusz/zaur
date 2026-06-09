<script lang="ts">
	import { browser } from '$app/environment';
	import { tick, untrack } from 'svelte';
	import { annotate } from 'rough-notation';
	import { importantMarker, type ImportantIntroSurface } from '$lib/mail/important-marker.svelte';
	import { IMPORTANT_MARKER_TEXT, markerHighlightColor } from '$lib/mail/important-marker-colors';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	type RoughAnnotation = ReturnType<typeof annotate>;
	type RoughAnnotationInternal = RoughAnnotation & {
		_seed?: number;
		_config?: { color: string };
	};

	interface Props {
		messageId: string;
		/** From importantMarker.highlightInstanceKey — bumps when newly marked Important. */
		instanceKey: string;
		/** Where this highlight renders — intro plays once per surface per mark. */
		surface: ImportantIntroSurface;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { messageId, instanceKey, surface, class: className = '', children }: Props = $props();

	let target = $state<HTMLElement | null>(null);
	let annotation = $state<RoughAnnotation | null>(null);

	const isSamplingColors = $derived(importantMarker.pickingMessageId === messageId);

	const hueShift = $derived.by(() => {
		void importantMarker.picked;
		if (isSamplingColors) {
			void importantMarker.pickingShift;
			return importantMarker.pickingShift;
		}
		return importantMarker.pickFor(messageId).hueShift;
	});

	const color = $derived(
		markerHighlightColor(importantMarker.baseHue(messageId) + hueShift)
	);

	function annotationConfig(currentColor: string, intro: boolean) {
		return {
			type: 'highlight' as const,
			color: currentColor,
			animate: intro,
			padding: 4,
			strokeWidth: 1.25,
			iterations: 1,
			multiline: true,
			animationDuration: intro ? 700 : 0
		};
	}

	function applyStableSeed(ann: RoughAnnotation, id: string) {
		(ann as RoughAnnotationInternal)._seed = importantMarker.notationSeed(id);
	}

	function patchMarkerSvgColor(targetEl: HTMLElement, nextColor: string) {
		const svg = targetEl.previousElementSibling;
		if (!(svg instanceof SVGSVGElement) || !svg.classList.contains('rough-annotation')) return;
		for (const path of svg.querySelectorAll('path')) {
			path.setAttribute('stroke', nextColor);
			path.style.animation = 'none';
			path.style.strokeDashoffset = '0';
			path.style.strokeDasharray = 'none';
		}
	}

	function syncAnnotationColor(ann: RoughAnnotation, targetEl: HTMLElement, nextColor: string) {
		const internal = ann as RoughAnnotationInternal;
		if (internal._config) internal._config.color = nextColor;
		patchMarkerSvgColor(targetEl, nextColor);
	}

	$effect(() => {
		void instanceKey;
		return () => {
			annotation?.remove();
			annotation = null;
		};
	});

	$effect(() => {
		if (!browser || !target || annotation) return;

		void instanceKey;
		const el = target;
		const id = messageId;
		const where = surface;

		let cancelled = false;
		let frameId = 0;
		let introTimer: ReturnType<typeof setTimeout> | null = null;
		let introStarted = false;

		void (async () => {
			await tick();
			if (cancelled || !el.isConnected) return;
			frameId = requestAnimationFrame(() => {
				if (cancelled || !el.isConnected || annotation) return;

				const startColor = untrack(() => color);
				const sampling = untrack(() => isSamplingColors);
				const intro =
					!sampling &&
					!settings.reduceMotion &&
					importantMarker.shouldIntroAnimate(id, where);
				const config = annotationConfig(startColor, intro);
				const ann = annotate(el, config);
				applyStableSeed(ann, id);
				annotation = ann;
				ann.show();

				if (intro) {
					introStarted = true;
					// Mark this surface at start so list pagination does not replay.
					importantMarker.markIntroShown(id, where);
					introTimer = setTimeout(
						() => importantMarker.completeIntroAnimation(id, where),
						config.animationDuration
					);
				}
			});
		})();

		return () => {
			cancelled = true;
			cancelAnimationFrame(frameId);
			if (introTimer) {
				clearTimeout(introTimer);
				importantMarker.completeIntroAnimation(id, where);
			} else if (introStarted) {
				importantMarker.completeIntroAnimation(id, where);
			}
		};
	});

	$effect(() => {
		if (!annotation || !target) return;
		const currentColor = color;
		const ann = annotation;
		const el = target;

		if (ann.color === currentColor) return;

		syncAnnotationColor(ann, el, currentColor);
	});
</script>

<!-- Positioning context for rough-notation SVG (inserted as sibling before the target span). -->
<span class="pointer-events-none relative inline max-w-full">
	<span
		bind:this={target}
		data-important-subject={messageId}
		class={cn('z-important-subject pointer-events-none relative inline font-semibold', className)}
		style:color={IMPORTANT_MARKER_TEXT}
	>
		{@render children?.()}
	</span>
</span>
