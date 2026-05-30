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
</script>

<div class="z-mail-pane-body z-mail-pane-body--simple flex min-h-0 flex-1 overflow-hidden">
	{#if !adaptiveSingleFocus}
		{@render list()}
	{/if}
	{#if !mail.hasSelection}
		{@render reader()}
	{/if}
</div>
