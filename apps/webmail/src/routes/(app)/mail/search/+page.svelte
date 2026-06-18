<script lang="ts">
	import { page } from '$app/stores';
	import MailPane from '$lib/components/mail/MailPane.svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import { mailCountLabel } from '$lib/mail/count-label';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { search } from '$lib/stores/search.svelte';

	const query = $derived($page.url.searchParams.get('q')?.trim() ?? '');
	const scopedMailboxId = $derived($page.url.searchParams.get('mailbox')?.trim() || null);
	const scopedMailbox = $derived(
		scopedMailboxId ? mail.mailboxes.find((mb) => mb.jmapId === scopedMailboxId) : undefined
	);
	const scopeSuffix = $derived(scopedMailbox ? ` in ${scopedMailbox.name}` : '');
	const mailboxName = $derived(query ? `Search: ${query}${scopeSuffix}` : 'Search');
	const countLabel = $derived(mailCountLabel(search.total, search.results.length, null));
	const searchEmptyHint = $derived(
		query ? undefined : 'Try a sender, subject, or keyword from the message body.'
	);

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring || !query) {
			if (!query) search.reset();
			return;
		}
		void search.search(client, query, mail.mailboxes, scopedMailboxId);
	});
</script>

<svelte:head>
	<title>{query ? `${query} · Search` : 'Search'} · ZAUR Webmail</title>
</svelte:head>

<MailPane
	{mailboxName}
	{countLabel}
	loading={search.loading}
	error={search.error}
	messageCount={search.results.length}
>
	{#snippet list()}
		<MessageList
			messages={search.results}
			{mailboxName}
			loading={search.loading}
			loadingMore={search.loadingMore}
			hasMore={search.hasMore}
			error={search.error}
			total={search.total}
			emptyMessage={query ? `No messages match “${query}”.` : 'Enter a search term to find messages.'}
			emptyHint={searchEmptyHint}
			emptyIcon="search"
			onLoadMore={() => {
				if (auth.client) void search.loadMore(auth.client, mail.mailboxes);
			}}
			onRetry={() => {
				if (auth.client && query) void search.search(auth.client, query, mail.mailboxes);
			}}
		/>
	{/snippet}
	{#snippet reader()}{/snippet}
</MailPane>
