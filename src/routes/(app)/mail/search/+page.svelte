<script lang="ts">
	import { goto } from '$app/navigation';
	import { Search } from 'lucide-svelte';
	import { page } from '$app/stores';
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import MessageReaderEmpty from '$lib/components/mail/MessageReaderEmpty.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { search } from '$lib/stores/search.svelte';

	let input = $state('');

	const query = $derived($page.url.searchParams.get('q')?.trim() ?? '');
	const mailboxName = $derived(query ? `Search: ${query}` : 'Search');

	$effect(() => {
		input = query;
	});

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring || !query) return;
		void search.search(client, query, mail.mailboxes);
	});

	function submit() {
		const trimmed = input.trim();
		if (!trimmed) return;
		goto(`/mail/search?q=${encodeURIComponent(trimmed)}`);
	}
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
	emptyMessage={query ? `No messages match “${query}”.` : 'Enter a search term to find messages.'}
	onLoadMore={() => {
		if (auth.client) void search.loadMore(auth.client, mail.mailboxes);
	}}
/>
<MessageReaderEmpty />

<div class="hidden min-w-0 flex-1 flex-col md:flex">
	<form
		class="border-b border-border px-6 py-4 md:hidden"
		role="search"
		onsubmit={(e) => {
			e.preventDefault();
			submit();
		}}
	>
		<label class="sr-only" for="mobile-search">Search mail</label>
		<div class="relative">
			<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
			<input
				id="mobile-search"
				type="search"
				class="z-input w-full pl-9"
				placeholder="Search messages…"
				autocomplete="off"
				bind:value={input}
			/>
		</div>
	</form>

	{#if !query && !search.loading}
		<p class="flex flex-1 items-center justify-center px-6 text-sm text-fg-muted">
			Enter a search term to find messages.
		</p>
	{/if}
</div>
