<script lang="ts">
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import MessageReaderEmpty from '$lib/components/mail/MessageReaderEmpty.svelte';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { search } from '$lib/stores/search.svelte';

	const query = $derived($page.url.searchParams.get('q')?.trim() ?? '');
	const mailboxName = $derived(query ? `Search: ${query}` : 'Search');

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring || !query) return;
		void search.search(client, query, mail.mailboxes);
	});
</script>

<svelte:head>
	<title>{query ? `${query} · Search` : 'Search'} · ZAUR Webmail</title>
</svelte:head>

<MailboxSidebar />
<MessageList
	messages={search.results}
	{mailboxName}
	loading={search.loading}
	loadingMore={search.loadingMore}
	hasMore={search.hasMore}
	error={search.error}
	total={search.total}
	onLoadMore={() => {
		if (auth.client) void search.loadMore(auth.client, mail.mailboxes);
	}}
/>
<MessageReaderEmpty />

{#if !query && !search.loading}
	<div class="hidden min-w-0 flex-1 items-center justify-center md:flex">
		<p class="text-sm text-fg-muted">Enter a search term in the header.</p>
	</div>
{/if}
