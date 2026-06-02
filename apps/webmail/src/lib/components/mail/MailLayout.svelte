<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import { mail } from '$lib/stores/mail.svelte';

	interface Props {
		list: Snippet;
		reader: Snippet;
	}

	let { list, reader }: Props = $props();

	const isThreadOpen = $derived(!!$page.params.threadId);
	const hideListWhileReading = $derived(isThreadOpen && !mail.hasSelection);
</script>

<div
	class="z-mail-pane-body z-mail-pane-body--flow flex w-full flex-col {isThreadOpen
		? 'z-mail-pane-body--thread-open'
		: ''}"
>
	{#if !hideListWhileReading}
		{@render list()}
	{/if}
	{#if isThreadOpen || !mail.hasSelection}
		{@render reader()}
	{/if}
</div>
