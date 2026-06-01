<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	interface Props {
		list: Snippet;
		reader: Snippet;
	}

	let { list, reader }: Props = $props();

	const isThreadOpen = $derived(!!$page.params.threadId);
	const adaptiveSingleFocus = $derived(
		!settings.showReaderListRail && isThreadOpen && !mail.hasSelection
	);
	const splitLayout = $derived(settings.showReaderListRail && !mail.hasSelection);
</script>

<div
	class="z-mail-pane-body z-mail-pane-body--flow flex w-full flex-col {splitLayout
		? 'z-mail-pane-body--split'
		: ''} {isThreadOpen ? 'z-mail-pane-body--thread-open' : ''}"
>
	{#if !adaptiveSingleFocus}
		{@render list()}
	{/if}
	{#if isThreadOpen || !mail.hasSelection}
		{@render reader()}
	{/if}
</div>
