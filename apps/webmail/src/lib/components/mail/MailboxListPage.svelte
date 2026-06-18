<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/stores';
	import MailPane from '$lib/components/mail/MailPane.svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import MessageReaderEmpty from '$lib/components/mail/MessageReaderEmpty.svelte';
	import { mailCountLabel } from '$lib/mail/count-label';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { search } from '$lib/stores/search.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	interface Props {
		mailboxId: string;
	}

	let { mailboxId }: Props = $props();

	const unseenOnly = $derived($page.url.searchParams.get('filter') === 'unseen');
	// Search renders in-place here (driven by ?q) rather than on a separate route,
	// so it never crosses the / ↔ /mail layout boundary and the views can't clash.
	const query = $derived($page.url.searchParams.get('q')?.trim() ?? '');
	const searching = $derived(!!query);
	const scopedMailboxId = $derived($page.url.searchParams.get('mailbox')?.trim() || null);

	const mailbox = $derived(mail.mailboxByRouteId(mailboxId));
	const mailboxName = $derived(searching ? `Search: ${query}` : (mailbox?.name ?? 'Emails'));
	const countLabel = $derived(
		searching
			? mailCountLabel(search.total, search.results.length, null)
			: mailCountLabel(mail.messagesTotal, mail.messages.length, mailbox)
	);

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring) return;
		const q = query;
		const scope = scopedMailboxId;
		const id = mailboxId;
		const unseen = unseenOnly;
		untrack(() => {
			if (q) {
				void search.search(client, q, mail.mailboxes, scope);
			} else {
				search.reset();
				void mail.loadMessages(client, id, { unseenOnly: unseen });
			}
		});
	});

	$effect(() => {
		if (!searching) settings.setLastMailbox(mailboxId);
	});
</script>

<svelte:head>
	<title>{searching ? `${query} · Search` : mailboxName} · ZAUR Webmail</title>
</svelte:head>

<MailPane
	{mailboxName}
	{countLabel}
	mailboxRouteId={searching ? undefined : mailboxId}
	loading={searching ? search.loading : mail.messagesLoading}
	error={searching ? search.error : mail.messagesError}
	messageCount={searching ? search.results.length : mail.messages.length}
>
	{#snippet list()}
		{#if searching}
			<MessageList
				messages={search.results}
				{mailboxName}
				loading={search.loading}
				loadingMore={search.loadingMore}
				hasMore={search.hasMore}
				error={search.error}
				total={search.total}
				emptyMessage={`No messages match “${query}”.`}
				emptyHint="Try a sender, subject, or keyword from the message body."
				emptyIcon="search"
				onLoadMore={() => {
					if (auth.client) void search.loadMore(auth.client, mail.mailboxes);
				}}
				onRetry={() => {
					if (auth.client && query)
						void search.search(auth.client, query, mail.mailboxes, scopedMailboxId);
				}}
			/>
		{:else}
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
		{/if}
	{/snippet}
	{#snippet reader()}
		<MessageReaderEmpty />
	{/snippet}
</MailPane>
