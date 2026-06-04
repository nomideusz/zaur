<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		list: Snippet;
		reader: Snippet;
	}

	let { list, reader }: Props = $props();

	const isThreadOpen = $derived(!!$page.params.threadId);
</script>

<div class="flex min-h-0 flex-1 flex-row overflow-hidden">
	<!-- List Pane -->
	<section
		class={cn(
			'z-mail-pane-surface flex min-h-0 min-w-0 flex-col overflow-hidden',
			isThreadOpen
				? 'hidden md:flex md:w-(--width-list) md:max-w-(--width-list) md:flex-none'
				: 'flex flex-1',
			isThreadOpen && 'md:border-r md:border-border'
		)}
		aria-label="Message list"
	>
		{@render list()}
	</section>

	<!-- Reader Pane -->
	<section
		class={cn(
			'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
			!isThreadOpen && 'hidden md:flex'
		)}
		aria-label="Message reader"
	>
		{@render reader()}
	</section>
</div>
