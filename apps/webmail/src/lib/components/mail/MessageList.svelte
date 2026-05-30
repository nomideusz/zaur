<script lang="ts">
	import ClassicMessageList from '$lib/modes/classic/ClassicMessageList.svelte';
	import SimpleMessageList from '$lib/modes/simple/SimpleMessageList.svelte';
	import { getWebmailModeContext } from '$lib/modes/context';
	import type { MessageListProps } from './message-list-props';

	let props: MessageListProps = $props();

	const mode = $derived(getWebmailModeContext());
</script>

{#if mode.id === 'traditional'}
	<ClassicMessageList {...props} />
{:else}
	<SimpleMessageList {...props} />
{/if}
