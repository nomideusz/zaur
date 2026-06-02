<script lang="ts">
	import MessageReaderCore from '$lib/components/mail/MessageReaderCore.svelte';
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

<MessageReaderCore {thread} {mailboxRouteId} {onMoved} minimalChrome />
