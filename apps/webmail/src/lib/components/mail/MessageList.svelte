<script lang="ts">
	import SimpleMessageList from '$lib/modes/simple/SimpleMessageList.svelte';
	import type { MessageListProps } from './message-list-props';

	let props: MessageListProps = $props();
</script>

<SimpleMessageList {...props} />
