<script lang="ts">
	import type { Snippet } from 'svelte';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import ScrollArea from '$lib/components/ui/ScrollArea.svelte';

	/* Focused, full-screen search scaffold shared by the section search routes so
	   every section's dedicated search view looks and behaves the same: a back
	   button, an autofocusing input, and a scrollable results pane. */

	interface Props {
		value: string;
		placeholder?: string;
		backHref: string;
		backLabel?: string;
		autofocus?: boolean;
		results: Snippet;
	}

	let {
		value = $bindable(''),
		placeholder = 'Search',
		backHref,
		backLabel = 'Back',
		autofocus = true,
		results
	}: Props = $props();

	let input = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (autofocus) input?.focus();
	});
</script>

<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
	<div class="z-search-screen__header flex shrink-0 items-center gap-2">
		<a href={backHref} class="z-back-btn no-underline" aria-label={backLabel}>
			<ArrowLeft class="size-5" aria-hidden="true" />
		</a>
		<label class="relative block min-w-0 flex-1">
			<span class="sr-only">{placeholder}</span>
			<Search
				class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
				aria-hidden="true"
			/>
			<input
				bind:this={input}
				bind:value
				type="search"
				enterkeyhint="search"
				inputmode="search"
				class="z-sidebar-search-input"
				{placeholder}
			/>
		</label>
	</div>

	<ScrollArea pane class="min-h-0 flex-1">
		{@render results()}
	</ScrollArea>
</div>
