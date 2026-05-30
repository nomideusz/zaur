<script lang="ts">
	import { page } from '$app/stores';
	import MessageListHeader from '$lib/components/mail/MessageListHeader.svelte';
	import MessageListItem from '$lib/components/mail/MessageListItem.svelte';
	import MessageListLoadMore from '$lib/components/mail/MessageListLoadMore.svelte';
	import MessageListMobileBar from '$lib/components/mail/MessageListMobileBar.svelte';
	import MessageListStatus from '$lib/components/mail/MessageListStatus.svelte';
	import type { MessageListProps } from '$lib/components/mail/message-list-props';
	import {
		activeMessageId,
		defaultEmptyHint,
		defaultEmptyMessage,
		messageHref
	} from '$lib/components/mail/message-list-utils';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { supportsMobileListGestures } from '$lib/utils/pointer-env';
	import { cn } from '$lib/utils/cn';

	let {
		messages,
		mailboxName,
		mailboxRouteId,
		loading = false,
		loadingMore = false,
		hasMore = false,
		error = null,
		emptyMessage,
		emptyHint,
		emptyIcon = 'inbox',
		emptyActionHref,
		emptyActionLabel,
		hideOnMobile = false,
		onLoadMore,
		onRetry,
		onBulkAction
	}: MessageListProps = $props();

	let loadSentinel = $state<HTMLDivElement | null>(null);

	const activeThreadId = $derived($page.params.threadId);
	const searchReturnTo = $derived.by(() => {
		if ($page.url.pathname !== '/mail/search') return null;
		return `${$page.url.pathname}${$page.url.search}`;
	});
	const currentMessageId = $derived(
		activeMessageId(
			messages,
			$page.url.searchParams.get('messageId'),
			activeThreadId
		)
	);
	const selectedIds = $derived([...mail.selectedMessageIds]);
	const bulkSelectEnabled = $derived(!!mailboxRouteId && settings.showBulkSelect);
	const showListHeader = $derived(bulkSelectEnabled);
	const showMobileSelectionBar = $derived(
		!!mailboxRouteId && mail.hasSelection && supportsMobileListGestures()
	);
	const resolvedEmptyMessage = $derived(emptyMessage ?? defaultEmptyMessage(mailboxRouteId));
	const resolvedEmptyHint = $derived(
		emptyHint ?? (emptyMessage ? null : defaultEmptyHint(mailboxRouteId))
	);
	const showEmpty = $derived(!loading && !error && messages.length === 0);

	$effect(() => {
		if (!settings.showBulkSelect && mail.hasSelection) {
			mail.clearSelection();
		}
	});

	$effect(() => {
		settings.autoLoadMore;
		hasMore;
		loadingMore;
		const sentinel = loadSentinel;
		const load = onLoadMore;
		if (!settings.autoLoadMore || !hasMore || !load || !sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && !loadingMore) load();
			},
			{ rootMargin: '240px' }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	});
</script>

<section
	class={cn(
		'z-mail-pane-surface z-mail-list--traditional flex min-h-0 min-w-0 flex-col overflow-hidden',
		'w-full md:w-(--width-list) md:max-w-(--width-list) md:flex-none',
		hideOnMobile ? (mail.hasSelection ? 'flex' : 'hidden md:flex') : 'flex',
		!settings.hidePaneBorders && 'border-r border-border',
		showMobileSelectionBar && 'z-mail-list--selecting'
	)}
	style="view-transition-name: message-list;"
	aria-label="{mailboxName} messages"
>
	{#if showListHeader}
		<div class="relative z-10 shrink-0">
			<MessageListHeader
				{mailboxRouteId}
				{onBulkAction}
				disabled={!!mailboxRouteId && (loading || !!error || !messages.length)}
			/>
		</div>
	{/if}

	<div
		class={cn('z-pane-scroll min-h-0 flex-1 overflow-y-auto', showMobileSelectionBar && 'z-mail-list-scroll--with-bar')}
	>
		{#if loading || error || showEmpty}
			<MessageListStatus
				{loading}
				{error}
				empty={showEmpty}
				emptyMessage={resolvedEmptyMessage}
				emptyHint={resolvedEmptyHint}
				{emptyIcon}
				{emptyActionHref}
				{emptyActionLabel}
				{mailboxRouteId}
				{onRetry}
			/>
		{:else}
			{#each messages as message (message.id)}
				<MessageListItem
					{message}
					href={messageHref(message, searchReturnTo)}
					active={currentMessageId === message.id}
					classicRow
					{bulkSelectEnabled}
					selected={mailboxRouteId ? selectedIds.includes(message.id) : false}
					{mailboxRouteId}
					enableMobileGestures={bulkSelectEnabled}
					onSelect={
						mailboxRouteId
							? (modifiers) =>
									mail.selectMessageAt(message.id, {
										...modifiers,
										activeMessageId: currentMessageId
									})
							: undefined
					}
				/>
			{/each}

			<MessageListLoadMore
				{hasMore}
				{loadingMore}
				{onLoadMore}
				bind:loadSentinel
			/>
		{/if}
	</div>

	{#if showMobileSelectionBar && mailboxRouteId}
		<MessageListMobileBar {mailboxRouteId} {onBulkAction} />
	{/if}
</section>
