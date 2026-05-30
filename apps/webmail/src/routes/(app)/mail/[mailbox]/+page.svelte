<script lang="ts">
	import { untrack } from 'svelte';
	import MailPane from '$lib/components/mail/MailPane.svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import MessageReaderEmpty from '$lib/components/mail/MessageReaderEmpty.svelte';
	import { mailCountLabel } from '$lib/mail/count-label';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { webmailModeDefinition } from '$lib/modes/registry';
	import { settings } from '$lib/stores/settings.svelte';

	const { data } = $props();

	const mailbox = $derived(mail.mailboxByRouteId(data.mailboxId));
	const mailboxName = $derived(mailbox?.name ?? 'Inbox');
	const countLabel = $derived(
		mailCountLabel(mail.messagesTotal, mail.messages.length, mailbox)
	);
	const activeMode = $derived(webmailModeDefinition(settings.mailViewMode));

	$effect(() => {
		const client = auth.client;
		const mailboxId = data.mailboxId;
		if (!client || auth.isRestoring) return;
		untrack(() => {
			void mail.loadMessages(client, mailboxId);
		});
	});

	$effect(() => {
		settings.setLastMailbox(data.mailboxId);
	});
</script>

<svelte:head>
	<title>{mailboxName} · ZAUR Webmail</title>
</svelte:head>

<MailPane
	{mailboxName}
	{countLabel}
	mailboxRouteId={data.mailboxId}
	loading={mail.messagesLoading}
	error={mail.messagesError}
	messageCount={mail.messages.length}
>
	{#snippet list()}
		<MessageList
			messages={mail.messages}
			{mailboxName}
			mailboxRouteId={data.mailboxId}
			expanded={activeMode.mail.useExpandedMessageList}
			loading={mail.messagesLoading}
			loadingMore={mail.messagesLoadingMore}
			hasMore={mail.messagesHasMore}
			error={mail.messagesError}
			total={mail.messagesTotal}
			onLoadMore={() => {
				if (auth.client) void mail.loadMoreMessages(auth.client);
			}}
			onRetry={() => {
				if (auth.client) void mail.loadMessages(auth.client, data.mailboxId, { force: true });
			}}
		/>
	{/snippet}
	{#snippet reader()}
		{#if activeMode.mail.showEmptyReaderPane}
			<div class="z-mail-reader-pane">
				<MessageReaderEmpty
					hideTitle
					description="Select a message from the list to read it here."
					showSettings={false}
				/>
			</div>
		{/if}
	{/snippet}
</MailPane>
