<script lang="ts">
	import { page } from '$app/stores';
	import MailPane from '$lib/components/mail/MailPane.svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import MessageReaderEmpty from '$lib/components/mail/MessageReaderEmpty.svelte';
	import { mailCountLabel } from '$lib/mail/count-label';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { search } from '$lib/stores/search.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	const query = $derived($page.url.searchParams.get('q')?.trim() ?? '');
	const mailboxName = $derived(
		query ? (settings.hideSearchListPrefix ? query : `Search: ${query}`) : 'Search'
	);
	const countLabel = $derived(mailCountLabel(search.total, search.results.length, null));
	const searchEmptyHint = $derived(
		settings.hideListEmptyHints || query ? undefined : 'Try a sender, subject, or keyword from the message body.'
	);

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring || !query) {
			if (!query) search.reset();
			return;
		}
		void search.search(client, query, mail.mailboxes);
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
			expanded={settings.expandListUntilOpen}
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
	{#snippet reader()}
		{#if !settings.expandListUntilOpen}
			<div class="z-mail-reader-pane">
				<MessageReaderEmpty
					title="Select a result"
					description="Choose a message from the search results to read it here."
					showCompose={false}
					showSettings={false}
				/>
			</div>
		{/if}
	{/snippet}
</MailPane>
