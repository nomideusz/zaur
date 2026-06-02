<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import MailPane from '$lib/components/mail/MailPane.svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import MessageReader from '$lib/components/mail/MessageReader.svelte';
	import MessageReaderSkeleton from '$lib/components/mail/MessageReaderSkeleton.svelte';
	import MessageReaderStatus from '$lib/components/mail/MessageReaderStatus.svelte';
	import { mailCountLabel } from '$lib/mail/count-label';
	import { mailListHref } from '$lib/mail/routes';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { readerFocus } from '$lib/stores/reader-focus.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { MAIL_LAYOUT } from '$lib/mail/config';

	interface Props {
		mailboxId: string;
		threadId: string;
	}

	let { mailboxId, threadId }: Props = $props();

	$effect(() => {
		readerFocus.setClean(settings.readerCleanView);
	});

	const mailbox = $derived(mail.mailboxByRouteId(mailboxId));
	const mailboxName = $derived(mailbox?.name ?? 'Emails');
	const thread = $derived(mail.selectedThread);
	const latest = $derived(thread.at(-1));
	const countLabel = $derived(
		mailCountLabel(mail.messagesTotal, mail.messages.length, mailbox)
	);
	const returnTo = $derived.by(() => {
		const value = $page.url.searchParams.get('returnTo');
		return value?.startsWith('/mail/search') ? value : null;
	});

	function backToList() {
		goto(returnTo ?? mailListHref(mailboxId));
	}

	function afterMove() {
		backToList();
	}

	function retryOpenMessage() {
		const client = auth.client;
		if (!client) return;
		void mail.loadMessage(client, mailboxId, threadId, {
			messageId: $page.url.searchParams.get('messageId'),
			force: true
		});
	}

	$effect(() => {
		const client = auth.client;
		const messageId = $page.url.searchParams.get('messageId');
		if (!client || auth.isRestoring) return;
		untrack(() => {
			void mail.loadMessage(client, mailboxId, threadId, { messageId });
		});
	});
</script>

<svelte:head>
	<title>{latest?.subject ?? mailboxName} · ZAUR Webmail</title>
</svelte:head>

<MailPane
	{mailboxName}
	{countLabel}
	mailboxRouteId={mailboxId}
	loading={mail.messagesLoading}
	error={mail.messagesError}
	messageCount={mail.messages.length}
	onBulkAction={afterMove}
	onBack={backToList}
	fullScreenMobile={MAIL_LAYOUT.mail.useFullscreenMobileReader}
>
	{#snippet list()}
		<MessageList
			messages={mail.messages}
			{mailboxName}
			mailboxRouteId={mailboxId}
			hideOnMobile
			loading={mail.messagesLoading}
			loadingMore={mail.messagesLoadingMore}
			hasMore={mail.messagesHasMore}
			error={mail.messagesError}
			total={mail.messagesTotal}
			onLoadMore={() => {
				if (auth.client) void mail.loadMoreMessages(auth.client);
			}}
			onRetry={() => {
				if (auth.client) void mail.loadMessages(auth.client, mailboxId, { force: true });
			}}
			onBulkAction={afterMove}
		/>
	{/snippet}
	{#snippet reader()}
		{#if mail.selectedLoading && thread.length === 0}
			<div class="z-mail-reader-pane">
				<MessageReaderSkeleton />
			</div>
		{:else if thread.length}
			<div class="z-mail-reader-pane">
				<MessageReader {thread} mailboxRouteId={mailboxId} onMoved={afterMove} />
			</div>
		{:else}
			<div class="z-mail-reader-pane">
				<MessageReaderStatus
					message={mail.selectedError ?? 'Message not found.'}
					onBack={backToList}
					onRetry={retryOpenMessage}
				/>
			</div>
		{/if}
	{/snippet}
</MailPane>
