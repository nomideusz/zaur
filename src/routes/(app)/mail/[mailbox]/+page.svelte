<script lang="ts">
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import MessageReaderEmpty from '$lib/components/mail/MessageReaderEmpty.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';

	const { data } = $props();

	const mailbox = $derived(mail.mailboxByRouteId(data.mailboxId));
	const mailboxName = $derived(mailbox?.name ?? 'Inbox');

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring) return;
		void mail.loadMessages(client, data.mailboxId);
	});
</script>

<svelte:head>
	<title>{mailboxName} · ZAUR Webmail</title>
</svelte:head>

<MailboxSidebar />
<MessageList
	messages={mail.messages}
	{mailboxName}
	mailboxRouteId={data.mailboxId}
	loading={mail.messagesLoading}
	loadingMore={mail.messagesLoadingMore}
	hasMore={mail.messagesHasMore}
	error={mail.messagesError}
	total={mail.messagesTotal}
	onLoadMore={() => {
		if (auth.client) void mail.loadMoreMessages(auth.client);
	}}
	onRetry={() => {
		if (auth.client) void mail.loadMessages(auth.client, data.mailboxId);
	}}
/>
<div class="z-mail-reader-pane">
	<MessageReaderEmpty />
</div>
