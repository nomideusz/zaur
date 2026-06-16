<script lang="ts">
	import SegmentGroupIndicator from '$lib/components/ui/segment-group/SegmentGroupIndicator.svelte';
	import {
		SEGMENT_GROUP_CTX,
		type SegmentGroupContext,
		type SegmentGroupVariant
	} from '$lib/components/ui/segment-group/segment-group-context';
	import { cn } from '$lib/utils/cn';
	import { setContext, untrack } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		value?: string;
		defaultValue?: string;
		variant?: SegmentGroupVariant;
		/** Sunken iOS-style track behind items. Off for horizontal folder rails. */
		track?: boolean;
		/** Classes for the sliding indicator (Shark `example-custom-indicator`). */
		indicatorClass?: string;
		class?: string;
		onValueChange?: (value: string) => void;
		children: Snippet;
	}

	let {
		value,
		defaultValue = '',
		variant = 'default',
		track = true,
		indicatorClass,
		class: className,
		onValueChange,
		children
	}: Props = $props();

	let internalValue = $state(untrack(() => defaultValue));
	let indicatorEl: HTMLElement | null = null;
	const itemEls = new Map<string, HTMLElement>();

	const isControlled = $derived(value !== undefined);
	const currentValue = $derived(isControlled ? value : internalValue);

	function setValue(next: string) {
		if (!isControlled) internalValue = next;
		onValueChange?.(next);
	}

	function syncIndicator() {
		if (!indicatorEl || !currentValue) return;
		const active = itemEls.get(currentValue);
		if (!active) return;

		indicatorEl.style.setProperty('--segment-left', `${active.offsetLeft}px`);
		indicatorEl.style.setProperty('--segment-width', `${active.offsetWidth}px`);
		indicatorEl.style.setProperty('--segment-height', `${active.offsetHeight}px`);
		indicatorEl.style.setProperty('--segment-top', `${active.offsetTop}px`);
	}

	function registerItem(el: HTMLElement, itemValue: string) {
		itemEls.set(itemValue, el);
		syncIndicator();
		return () => {
			itemEls.delete(itemValue);
			syncIndicator();
		};
	}

	function setIndicatorTarget(el: HTMLElement | null) {
		indicatorEl = el;
		syncIndicator();
	}

	const segmentCtx: SegmentGroupContext = {
		get value() {
			return currentValue;
		},
		get variant() {
			return variant;
		},
		get track() {
			return track;
		},
		setValue,
		registerItem,
		setIndicatorTarget
	};

	setContext(SEGMENT_GROUP_CTX, segmentCtx);

	$effect(() => {
		void currentValue;
		queueMicrotask(syncIndicator);
	});
</script>

<div
	role="radiogroup"
	class={cn(
		'z-segment-group group/segment-group relative isolate inline-flex min-w-min items-center gap-2',
		variant === 'underline' && 'z-segment-group--underline gap-1 border-b border-border',
		variant === 'default' && track && 'z-segmented',
		variant === 'default' && !track && 'z-segment-group--rail gap-1',
		className
	)}
	data-slot="segment-group"
	data-variant={variant}
>
	<SegmentGroupIndicator class={indicatorClass} />
	{@render children()}
</div>
