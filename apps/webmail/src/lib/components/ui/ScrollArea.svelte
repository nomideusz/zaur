<script lang="ts">
	import { ScrollArea } from '@ark-ui/svelte/scroll-area';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		viewportClass?: string;
		/** Scrollable viewport element — pass to infinite-scroll observers and PTR. */
		viewportRef?: HTMLElement | null;
		/** Vertical-only omits the horizontal scrollbar and corner (message lists). */
		orientation?: 'vertical' | 'both';
		/** Mobile island clearance + scroll padding (message/settings panes). */
		pane?: boolean;
		children: Snippet;
	}

	let {
		class: className,
		viewportClass,
		viewportRef = $bindable(null),
		orientation = 'vertical',
		pane = false,
		children
	}: Props = $props();
</script>

<ScrollArea.Root
	class={cn(
		'z-scroll-area relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
		pane && 'z-scroll-area--pane',
		className
	)}
>
	<ScrollArea.Viewport
		bind:ref={viewportRef}
		class={cn('z-scroll-area__viewport h-full w-full min-w-0', viewportClass)}
	>
		<ScrollArea.Content class="z-scroll-area__content flex min-h-full w-full min-w-0 flex-col">
			{@render children()}
		</ScrollArea.Content>
	</ScrollArea.Viewport>
	<ScrollArea.Scrollbar orientation="vertical" class="z-scroll-area__scrollbar">
		<ScrollArea.Thumb class="z-scroll-area__thumb" />
	</ScrollArea.Scrollbar>
	{#if orientation === 'both'}
		<ScrollArea.Scrollbar
			orientation="horizontal"
			class="z-scroll-area__scrollbar z-scroll-area__scrollbar--horizontal"
		>
			<ScrollArea.Thumb class="z-scroll-area__thumb" />
		</ScrollArea.Scrollbar>
		<ScrollArea.Corner class="z-scroll-area__corner" />
	{/if}
</ScrollArea.Root>
