<script lang="ts">
	import { goto } from '$app/navigation';
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import MessageReader from '$lib/components/mail/MessageReader.svelte';
	import MessageReaderSkeleton from '$lib/components/mail/MessageReaderSkeleton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';

	const { data } = $props();

	const mailbox = $derived(mail.mailboxByRouteId(data.mailboxId));
	const mailboxName = $derived(mailbox?.name ?? 'Inbox');
	const thread = $derived(mail.selectedThread);
	const latest = $derived(thread.at(-1));

	function backToList() {
		goto(`/mail/${data.mailboxId}`);
	}

	function afterMove() {
		backToList();
	}

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring) return;
		void mail.loadMessage(client, data.mailboxId, data.threadId);
	});
</script>

<svelte:head>
	<title>{latest?.subject ?? mailboxName} · ZAUR Webmail</title>
</svelte:head>

<MailboxSidebar />
<MessageList
	messages={mail.messages}
	{mailboxName}
	mailboxRouteId={data.mailboxId}
	hideOnMobile
	loading={mail.messagesLoading}
	loadingMore={mail.messagesLoadingMore}
	hasMore={mail.messagesHasMore}
	error={mail.messagesError}
	total={mail.messagesTotal}
	onLoadMore={() => {
		if (auth.client) void mail.loadMoreMessages(auth.client);
	}}
	onBulkAction={afterMove}
/>

{#if mail.selectedLoading}
	<div class="hidden min-w-0 flex-1 md:flex">
		<MessageReaderSkeleton />
	</div>
	<div
		class="fixed inset-x-0 bottom-0 z-30 flex bg-surface md:hidden"
		style="top: var(--height-header);"
	>
		<MessageReaderSkeleton />
	</div>
{:else if thread.length}
	<div class="hidden min-w-0 flex-1 md:flex">
		<MessageReader {thread} mailboxRouteId={data.mailboxId} onMoved={afterMove} />
	</div>

	<div
		class="fixed inset-x-0 bottom-0 z-30 flex bg-surface md:hidden"
		style="top: var(--height-header);"
	>
		<MessageReader
			{thread}
			mailboxRouteId={data.mailboxId}
			onBack={backToList}
			onMoved={afterMove}
		/>
	</div>
{:else}
	<div class="hidden min-w-0 flex-1 md:flex">
		<p class="flex flex-1 items-center justify-center text-sm text-fg-muted">
			{mail.selectedError ?? 'Message not found.'}
		</p>
	</div>
	<div
		class="fixed inset-x-0 bottom-0 z-30 flex items-center justify-center bg-surface px-6 md:hidden"
		style="top: var(--height-header);"
	>
		<p class="text-center text-sm text-fg-muted">{mail.selectedError ?? 'Message not found.'}</p>
	</div>
{/if}
