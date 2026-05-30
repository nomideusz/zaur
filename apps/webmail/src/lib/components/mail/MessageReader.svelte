<script lang="ts">
	import ClassicMessageReader from '$lib/modes/classic/ClassicMessageReader.svelte';
	import SimpleMessageReader from '$lib/modes/simple/SimpleMessageReader.svelte';
	import { getWebmailModeContext } from '$lib/modes/context';
	import type { MessageDetail } from '$lib/types/mail';

	let {
		thread,
		mailboxRouteId,
		onMoved
	}: {
		thread: MessageDetail[];
		mailboxRouteId: string;
		onMoved?: () => void;
	} = $props();

	const mode = $derived(getWebmailModeContext());
</script>

{#if mode.id === 'traditional'}
	<ClassicMessageReader {thread} {mailboxRouteId} {onMoved} />
{:else}
	<SimpleMessageReader {thread} {mailboxRouteId} {onMoved} />
{/if}
