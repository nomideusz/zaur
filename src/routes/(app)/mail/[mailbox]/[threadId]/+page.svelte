<script lang="ts">
	import { goto } from '$app/navigation';
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import MessageReader from '$lib/components/mail/MessageReader.svelte';
	import { mockMailboxes, mockMessageDetails, mockMessages } from '$lib/mocks/inbox';

	const { data } = $props();

	const mailboxName = $derived(
		mockMailboxes.find((mb) => mb.id === data.mailboxId)?.name ?? 'Inbox'
	);

	const messages = $derived(mockMessages.filter((m) => m.mailboxId === data.mailboxId));

	const preview = $derived(messages.find((m) => m.threadId === data.threadId));
	const message = $derived(preview ? mockMessageDetails[preview.id] : undefined);
</script>

<svelte:head>
	<title>{message?.subject ?? mailboxName} · ZAUR Webmail</title>
</svelte:head>

<MailboxSidebar />
<MessageList {messages} {mailboxName} />

{#if message}
	<div class="hidden min-w-0 flex-1 md:flex">
		<MessageReader {message} />
	</div>

	<div class="fixed inset-0 z-30 flex bg-surface md:hidden">
		<MessageReader {message} onBack={() => goto(`/mail/${data.mailboxId}`)} />
	</div>
{:else}
	<div class="hidden min-w-0 flex-1 md:flex">
		<p class="flex flex-1 items-center justify-center text-sm text-fg-muted">Message not found.</p>
	</div>
{/if}
