<script lang="ts">
	import { SEGMENT_GROUP_CTX, type SegmentGroupContext } from '$lib/components/ui/segment-group/segment-group-context';
	import { cn } from '$lib/utils/cn';
	import { getContext } from 'svelte';

	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();

	const segmentGroup = getContext<SegmentGroupContext>(SEGMENT_GROUP_CTX);

	function attachIndicator(node: HTMLDivElement) {
		segmentGroup.setIndicatorTarget(node);
		return {
			destroy() {
				segmentGroup.setIndicatorTarget(null);
			}
		};
	}

	const usesCustomIndicator = $derived(!!className);
</script>

<div
	use:attachIndicator
	aria-hidden="true"
	class={cn(
		'z-segment-group__indicator pointer-events-none absolute top-(--segment-top) left-(--segment-left) z-0 h-(--segment-height) w-(--segment-width) rounded-[inherit] transition-[left,width,top,height] duration-150 ease-out motion-reduce:transition-none',
		segmentGroup.variant === 'default' &&
			!usesCustomIndicator &&
			'rounded-[inherit] bg-surface-raised shadow-sm',
		segmentGroup.variant === 'underline' &&
			'top-[calc(var(--segment-top)+var(--segment-height)-2px)] h-0.5 bg-accent',
		className
	)}
	data-slot="segment-group-indicator"
></div>
