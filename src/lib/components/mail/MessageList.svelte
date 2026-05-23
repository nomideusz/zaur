<script lang="ts">
	import { page } from '$app/stores';
	import MessageListItem from './MessageListItem.svelte';
	import type { MessagePreview } from '$lib/types/mail';

	interface Props {
		messages: MessagePreview[];
		mailboxName: string;
	}

	let { messages, mailboxName }: Props = $props();

	const activeThreadId = $derived($page.params.threadId);
</script>

<section
	class="z-panel flex w-full max-w-(--width-list) shrink-0 flex-col border-r md:w-(--width-list)"
	style="view-transition-name: message-list;"
	aria-label="{mailboxName} messages"
>
	<div class="flex h-12 items-center border-b border-border px-4">
		<h2 class="text-sm font-semibold text-fg">{mailboxName}</h2>
		<span class="ml-2 text-xs text-fg-subtle">{messages.length}</span>
	</div>

	<div class="flex-1 overflow-y-auto">
		{#if messages.length === 0}
			<p class="px-4 py-8 text-center text-sm text-fg-muted">No messages in this folder.</p>
		{:else}
			{#each messages as message (message.id)}
				<MessageListItem
					{message}
					href="/mail/{message.mailboxId}/{message.threadId}"
					active={activeThreadId === message.threadId}
				/>
			{/each}
		{/if}
	</div>
</section>
