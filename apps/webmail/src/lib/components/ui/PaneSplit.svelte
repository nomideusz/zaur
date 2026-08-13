<script lang="ts">
	import { Splitter } from '@ark-ui/svelte/splitter';
	import { untrack, type Snippet } from 'svelte';
	import {
		loadPaneSplit,
		savePaneSplit,
		type PaneSplitMobile
	} from '$lib/components/ui/pane-split';
	import { cn } from '$lib/utils/cn';

	let {
		storageKey,
		defaultSize,
		firstId = 'start',
		secondId = 'end',
		firstMin = '13rem',
		firstMax = '26rem' as string | number | null,
		secondMin = '50%',
		secondMax = undefined as string | number | undefined,
		firstWidthVar = undefined as string | undefined,
		firstClass = '',
		secondClass = '',
		mobileFirst = 'hide' as PaneSplitMobile,
		mobileSecond = 'fill' as PaneSplitMobile,
		triggerLabel,
		first,
		second,
		class: className = ''
	}: {
		storageKey: string;
		defaultSize: readonly number[];
		firstId?: string;
		secondId?: string;
		firstMin?: string | number;
		firstMax?: string | number | null;
		secondMin?: string | number;
		secondMax?: string | number | undefined;
		/** When set, the first panel assigns this CSS var to 100% so children fill it. */
		firstWidthVar?: string;
		firstClass?: string;
		secondClass?: string;
		mobileFirst?: PaneSplitMobile;
		mobileSecond?: PaneSplitMobile;
		triggerLabel: string;
		first: Snippet;
		second: Snippet;
		class?: string;
	} = $props();

	let splitSize = $state(untrack(() => loadPaneSplit(storageKey, defaultSize)));

	const panels = $derived([
		{
			id: firstId,
			minSize: firstMin,
			...(firstMax != null ? { maxSize: firstMax } : {})
		},
		{
			id: secondId,
			minSize: secondMin,
			...(secondMax != null ? { maxSize: secondMax } : {})
		}
	]);

	const triggerId = $derived(`${firstId}:${secondId}` as `${string}:${string}`);

	function resetSplit() {
		splitSize = [...defaultSize];
		savePaneSplit(storageKey, [...defaultSize]);
	}

	function mobileClass(mode: PaneSplitMobile): string {
		if (mode === 'hide') return 'max-md:hidden!';
		if (mode === 'fill') return 'z-pane-split-panel--mobile-fill';
		return '';
	}
</script>

<Splitter.Root
	{panels}
	bind:size={splitSize}
	onResizeEnd={(details) => savePaneSplit(storageKey, details.size)}
	class={cn('flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden', className)}
>
	<Splitter.Panel
		id={firstId}
		class={cn('flex min-h-0 min-w-0', mobileClass(mobileFirst), firstClass)}
		style={firstWidthVar ? `${firstWidthVar}: 100%` : undefined}
	>
		{@render first()}
	</Splitter.Panel>
	<Splitter.ResizeTrigger
		id={triggerId}
		aria-label="{triggerLabel} (double-click to reset)"
		title="Drag to resize · double-click to reset"
		class="z-pane-split-trigger z-mail-split-trigger max-md:hidden!"
		ondblclick={resetSplit}
	/>
	<Splitter.Panel
		id={secondId}
		class={cn('flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden', mobileClass(mobileSecond), secondClass)}
	>
		{@render second()}
	</Splitter.Panel>
</Splitter.Root>
