<script lang="ts">
	import MessageReaderCore from '$lib/components/mail/MessageReaderCore.svelte';
	import type { MessageDetail } from '$lib/types/mail';

	let {
		thread,
		mailboxRouteId,
		onMoved,
		onBackToList
	}: {
		thread: MessageDetail[];
		mailboxRouteId: string;
		onMoved?: () => void;
		onBackToList?: () => void;
	} = $props();
</script>

<MessageReaderCore {thread} {mailboxRouteId} {onMoved} {onBackToList} minimalChrome />
