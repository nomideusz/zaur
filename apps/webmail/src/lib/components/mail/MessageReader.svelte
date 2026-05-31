<script lang="ts">
	import SimpleMessageReader from '$lib/modes/simple/SimpleMessageReader.svelte';
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
</script>

<SimpleMessageReader {thread} {mailboxRouteId} {onMoved} />
