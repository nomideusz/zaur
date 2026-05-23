<script lang="ts">
	import { goto } from '$app/navigation';
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import MessageReader from '$lib/components/mail/MessageReader.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';

	const { data } = $props();

	const mailbox = $derived(mail.mailboxByRouteId(data.mailboxId));
	const mailboxName = $derived(mailbox?.name ?? 'Inbox');
	const message = $derived(mail.selectedMessage);

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
	<title>{message?.subject ?? mailboxName} · ZAUR Webmail</title>
</svelte:head>

<MailboxSidebar />
<MessageList
	messages={mail.messages}
	{mailboxName}
	loading={mail.messagesLoading}
	loadingMore={mail.messagesLoadingMore}
	hasMore={mail.messagesHasMore}
	error={mail.messagesError}
	total={mail.messagesTotal}
	onLoadMore={() => {
		if (auth.client) void mail.loadMoreMessages(auth.client);
	}}
/>

{#if mail.selectedLoading}
	<div class="hidden min-w-0 flex-1 items-center justify-center md:flex">
		<p class="text-sm text-fg-muted">Loading message…</p>
	</div>
{:else if message}
	<div class="hidden min-w-0 flex-1 md:flex">
		<MessageReader {message} mailboxRouteId={data.mailboxId} onMoved={afterMove} />
	</div>

	<div class="fixed inset-0 z-30 flex bg-surface md:hidden">
		<MessageReader
			{message}
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
{/if}
