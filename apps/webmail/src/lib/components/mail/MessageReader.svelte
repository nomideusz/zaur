<script lang="ts">
	import MessageReaderCore from '$lib/components/mail/MessageReaderCore.svelte';
	import { settings } from '$lib/stores/settings.svelte';
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

	const minimalChrome = $derived(!settings.showReaderListRail);
</script>

<MessageReaderCore {thread} {mailboxRouteId} {onMoved} {minimalChrome} />
