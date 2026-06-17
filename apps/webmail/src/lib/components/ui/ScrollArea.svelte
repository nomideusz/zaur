<script lang="ts">
	import { ScrollArea } from '@ark-ui/svelte/scroll-area';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		viewportClass?: string;
		/** Scrollable viewport element — pass to infinite-scroll observers and PTR. */
		viewportRef?: HTMLElement | null;
		children: Snippet;
	}

	let {
		class: className,
		viewportClass,
		viewportRef = $bindable(null),
		children
	}: Props = $props();
</script>

<ScrollArea.Root
	class={cn(
		'z-scroll-area relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
		className
	)}
>
	<ScrollArea.Viewport
		bind:ref={viewportRef}
		class={cn('z-pane-scroll z-scroll-area__viewport h-full w-full', viewportClass)}
	>
		<ScrollArea.Content class="z-scroll-area__content flex min-h-full min-w-full flex-col">
			{@render children()}
		</ScrollArea.Content>
	</ScrollArea.Viewport>
	<ScrollArea.Scrollbar orientation="vertical" class="z-scroll-area__scrollbar">
		<ScrollArea.Thumb class="z-scroll-area__thumb" />
	</ScrollArea.Scrollbar>
	<ScrollArea.Scrollbar orientation="horizontal" class="z-scroll-area__scrollbar z-scroll-area__scrollbar--horizontal">
		<ScrollArea.Thumb class="z-scroll-area__thumb" />
	</ScrollArea.Scrollbar>
	<ScrollArea.Corner class="z-scroll-area__corner" />
</ScrollArea.Root>
