<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/stores';
	import MailPane from '$lib/components/mail/MailPane.svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import MessageReaderEmpty from '$lib/components/mail/MessageReaderEmpty.svelte';
	import { mailCountLabel } from '$lib/mail/count-label';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	interface Props {
		mailboxId: string;
	}

	let { mailboxId }: Props = $props();

	const unseenOnly = $derived($page.url.searchParams.get('filter') === 'unseen');
	const mailbox = $derived(mail.mailboxByRouteId(mailboxId));
	const mailboxName = $derived(mailbox?.name ?? 'Emails');
	const countLabel = $derived(
		mailCountLabel(mail.messagesTotal, mail.messages.length, mailbox)
	);

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring) return;
		const id = mailboxId;
		const unseen = unseenOnly;
		untrack(() => {
			void mail.loadMessages(client, id, { unseenOnly: unseen });
		});
	});

	$effect(() => {
		settings.setLastMailbox(mailboxId);
	});
</script>

<svelte:head>
	<title>{mailboxName} · ZAUR Webmail</title>
</svelte:head>

<MailPane
	{mailboxName}
	{countLabel}
	mailboxRouteId={mailboxId}
	loading={mail.messagesLoading}
	error={mail.messagesError}
	messageCount={mail.messages.length}
>
	{#snippet list()}
		<MessageList
			messages={mail.messages}
			{mailboxName}
			mailboxRouteId={mailboxId}
			{unseenOnly}
			loading={mail.messagesLoading}
			loadingMore={mail.messagesLoadingMore}
			hasMore={mail.messagesHasMore}
			error={mail.messagesError}
			total={mail.messagesTotal}
			emptyMessage={unseenOnly ? 'Nothing unseen' : undefined}
			emptyHint={unseenOnly ? 'You are all caught up.' : undefined}
			onLoadMore={() => {
				if (auth.client) void mail.loadMoreMessages(auth.client);
			}}
			onRetry={() => {
				if (auth.client)
					void mail.loadMessages(auth.client, mailboxId, { force: true, unseenOnly });
			}}
		/>
	{/snippet}
	{#snippet reader()}
		<MessageReaderEmpty />
	{/snippet}
</MailPane>
