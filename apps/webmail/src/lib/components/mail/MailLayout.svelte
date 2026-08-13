<script lang="ts">
	import { page } from '$app/stores';
	import PaneSplit from '$lib/components/ui/PaneSplit.svelte';
	import { PANE_SPLIT } from '$lib/components/ui/pane-split';
	import type { Snippet } from 'svelte';

	interface Props {
		list: Snippet;
		reader: Snippet;
	}

	let { list, reader }: Props = $props();

	const isThreadOpen = $derived(!!$page.params.threadId);
</script>

<PaneSplit
	class="z-mail-layout"
	storageKey={PANE_SPLIT.mailList.key}
	defaultSize={PANE_SPLIT.mailList.defaultSize}
	firstId="list"
	secondId="reader"
	firstMin="18rem"
	firstMax="40rem"
	secondMin="40%"
	mobileFirst={isThreadOpen ? 'hide' : 'fill'}
	mobileSecond={isThreadOpen ? 'fill' : 'hide'}
	triggerLabel="Resize message list"
>
	{#snippet first()}
		<section
			class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:border-r md:border-border"
			aria-label="Message list"
		>
			{@render list()}
		</section>
	{/snippet}
	{#snippet second()}
		<section
			class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
			aria-label="Message reader"
		>
			{@render reader()}
		</section>
	{/snippet}
</PaneSplit>
