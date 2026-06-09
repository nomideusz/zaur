<script lang="ts">
	import {
		SEGMENT_GROUP_CTX,
		type SegmentGroupContext
	} from '$lib/components/ui/segment-group/segment-group-context';
	import { cn } from '$lib/utils/cn';
	import { getContext } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		value: string;
		href?: string;
		disabled?: boolean;
		class?: string;
		children: Snippet;
	}

	let { value, href, disabled = false, class: className, children }: Props = $props();

	const segmentGroup = getContext<SegmentGroupContext>(SEGMENT_GROUP_CTX);

	const selected = $derived(segmentGroup.value === value);

	function attachItem(node: HTMLElement) {
		const cleanup = segmentGroup.registerItem(node, value);
		return { destroy: cleanup };
	}

	const itemClass = $derived(
		cn(
			'z-segment-group__item relative z-1 shrink-0 cursor-pointer border border-transparent outline-none',
			segmentGroup.variant === 'default' && segmentGroup.track && 'z-segmented__item',
			segmentGroup.variant === 'underline' && 'px-2 py-1.5 text-sm font-medium text-fg-muted',
			segmentGroup.variant === 'underline' && selected && 'text-fg',
			disabled && 'pointer-events-none opacity-64',
			className
		)
	);
</script>

{#if href && !disabled}
	<a
		use:attachItem
		{href}
		class={itemClass}
		aria-current={selected ? 'page' : undefined}
		data-slot="segment-group-item"
		data-value={value}
		data-state={selected ? 'checked' : 'unchecked'}
	>
		{@render children()}
	</a>
{:else}
	<button
		use:attachItem
		type="button"
		role="radio"
		class={itemClass}
		aria-checked={selected}
		{disabled}
		data-slot="segment-group-item"
		data-value={value}
		data-state={selected ? 'checked' : 'unchecked'}
		onclick={() => segmentGroup.setValue(value)}
	>
		{@render children()}
	</button>
{/if}
