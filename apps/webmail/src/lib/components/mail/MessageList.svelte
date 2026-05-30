<script lang="ts">
	import AlertCircle from '$lib/components/icons/AlertCircle.svelte';
	import LoaderCircle from '$lib/components/icons/LoaderCircle.svelte';
	import Inbox from '$lib/components/icons/Inbox.svelte';
	import RefreshCw from '$lib/components/icons/RefreshCw.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import { frameSvg } from '@zaur/sprite';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';
	import MessageListItem from './MessageListItem.svelte';
	import MessageListHeader from './MessageListHeader.svelte';
	import MessageListMobileBar from './MessageListMobileBar.svelte';
	import { supportsMobileListGestures } from '$lib/utils/pointer-env';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import type { MessagePreview } from '$lib/types/mail';
	import { cn } from '$lib/utils/cn';

	interface Props {
		messages: MessagePreview[];
		mailboxName: string;
		mailboxRouteId?: string;
		loading?: boolean;
		loadingMore?: boolean;
		hasMore?: boolean;
		error?: string | null;
		total?: number;
		emptyMessage?: string;
		emptyHint?: string;
		emptyIcon?: 'inbox' | 'search' | 'none';
		emptyActionHref?: string;
		emptyActionLabel?: string;
		hideOnMobile?: boolean;
		expanded?: boolean;
		onLoadMore?: () => void;
		onRetry?: () => void;
		onBulkAction?: () => void;
	}

	let {
		messages,
		mailboxName,
		mailboxRouteId,
		loading = false,
		loadingMore = false,
		hasMore = false,
		error = null,
		total,
		emptyMessage,
		emptyHint,
		emptyIcon = 'inbox',
		emptyActionHref,
		emptyActionLabel,
		hideOnMobile = false,
		expanded = false,
		onLoadMore,
		onRetry,
		onBulkAction
	}: Props = $props();

	let loadSentinel = $state<HTMLDivElement | null>(null);

	const activeThreadId = $derived($page.params.threadId);
	const searchReturnTo = $derived.by(() => {
		if ($page.url.pathname !== '/mail/search') return null;
		return `${$page.url.pathname}${$page.url.search}`;
	});
	const activeMessageId = $derived.by(() => {
		const urlMessageId = $page.url.searchParams.get('messageId');
		if (urlMessageId) return urlMessageId;

		if (!activeThreadId) return null;
		return (
			messages.find((message) => message.threadId === activeThreadId)?.id ??
			mail.messages.find((message) => message.threadId === activeThreadId)?.id ??
			null
		);
	});
	const selectedIds = $derived([...mail.selectedMessageIds]);
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

	const defaultEmptyMessage = $derived.by(() => {
		switch (mailboxRouteId) {
			case 'inbox':
				return 'Inbox zero';
			case 'drafts':
				return 'No drafts yet';
			case 'sent':
				return 'Nothing sent yet';
			case 'trash':
				return 'Trash is clear';
			case 'archive':
				return 'Archive is clear';
			case 'junk':
				return 'No junk mail';
			default:
				return 'Nothing here yet';
		}
	});

	const defaultEmptyHint = $derived.by(() => {
		switch (mailboxRouteId) {
			case 'inbox':
				return 'New messages will appear here as soon as they arrive.';
			case 'drafts':
				return 'Start a message and it will be saved here automatically.';
			case 'sent':
				return 'Messages you send will be collected here for easy reference.';
			case 'trash':
				return 'Deleted messages will stay here until you empty them.';
			default:
				return null;
		}
	});

	function messageHref(message: MessagePreview): string {
		const href = `/mail/${message.mailboxId}/${message.threadId}`;
		const searchParams = new URLSearchParams();
		searchParams.set('messageId', message.id);
		if (searchReturnTo) {
			searchParams.set('returnTo', searchReturnTo);
		}
		return `${href}?${searchParams.toString()}`;
	}

	const listExpanded = $derived(expanded || mail.hasSelection);
	const bulkSelectEnabled = $derived(!!mailboxRouteId && settings.showBulkSelect);
	const showListHeader = $derived(bulkSelectEnabled && mail.hasSelection);
	const showMobileSelectionBar = $derived(
		!!mailboxRouteId && mail.hasSelection && supportsMobileListGestures()
	);
</script>

<section
	class={cn(
		'z-mail-pane-surface flex min-h-0 min-w-0 flex-col overflow-hidden',
		listExpanded ? 'flex-1' : 'w-full md:w-(--width-list) md:max-w-(--width-list) md:flex-none',
		hideOnMobile ? (mail.hasSelection ? 'flex' : 'hidden md:flex') : 'flex',
		!settings.hidePaneBorders && !listExpanded && 'border-r border-border',
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
		{#if loading}
			<LoadingIndicator label="Loading messages…" />
		{:else if error}
			<div
				class={cn(
					'flex flex-col items-center text-center',
					settings.compactListErrorState ? 'gap-2 px-4 py-8' : 'gap-3 px-5 py-12'
				)}
			>
				<div class={cn('text-danger', settings.compactListErrorState ? 'p-1' : 'p-2')}>
					<AlertCircle class={cn(settings.compactListErrorState ? 'size-8' : 'size-10')} aria-hidden="true" />
				</div>
				<div>
					<p class="text-sm font-semibold text-fg">Messages could not load</p>
					<p class="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-fg-muted">{error}</p>
				</div>
				{#if onRetry && !settings.hideListErrorRetry}
					<Button variant="ghost" class="text-sm" onclick={onRetry}>
						<RefreshCw class="size-4" aria-hidden="true" />
						Try again
					</Button>
				{/if}
			</div>
		{:else if messages.length === 0}
			<div
				class={cn(
					'flex flex-col items-center text-center',
					settings.compactListEmptyState ? 'gap-3 px-4 py-10' : 'gap-4 px-6 py-16'
				)}
			>
				{#if emptyIcon !== 'none' && !settings.hideListEmptyHints}
					<div class="text-fg-subtle">
						{#if emptyIcon === 'search'}
							{@html frameSvg('sad', { color: 'currentColor', scale: 2 })}
						{:else}
							{@html frameSvg('sleep', { color: 'currentColor', scale: 2 })}
						{/if}
					</div>
				{/if}
				<div>
					<p class="text-sm font-semibold text-fg">
						{emptyMessage ?? defaultEmptyMessage}
					</p>
					{#if !settings.hideListEmptyHints}
						{#if emptyHint}
							<p class="mx-auto mt-1 max-w-xs text-xs text-fg-muted">{emptyHint}</p>
						{:else if !emptyMessage && defaultEmptyHint}
							<p class="mx-auto mt-1 max-w-xs text-xs text-fg-muted">{defaultEmptyHint}</p>
						{/if}
					{/if}
				</div>
				{#if !settings.hideListEmptyActions}
					{#if emptyActionHref && emptyActionLabel}
						<Button href={emptyActionHref} variant="ghost" class="text-sm">{emptyActionLabel}</Button>
					{:else if mailboxRouteId === 'inbox' || mailboxRouteId === 'drafts'}
						<Button href="/mail/compose" variant="ghost" class="text-sm">New message</Button>
					{/if}
				{/if}
			</div>
		{:else}
			{#each messages as message (message.id)}
				<MessageListItem
					{message}
					href={messageHref(message)}
					active={activeMessageId === message.id}
					bulkSelectEnabled={bulkSelectEnabled}
					selected={mailboxRouteId ? selectedIds.includes(message.id) : false}
					{mailboxRouteId}
					enableMobileGestures={bulkSelectEnabled}
					onSelect={
						mailboxRouteId
							? (modifiers) =>
									mail.selectMessageAt(message.id, { ...modifiers, activeMessageId })
							: undefined
					}
				/>
			{/each}

			{#if hasMore && onLoadMore}
				<div
					class={cn(
						'px-4',
						settings.compactLoadMore ? 'py-1.5' : 'py-3',
						!settings.hideListRowDividers && 'border-t border-border'
					)}
					bind:this={loadSentinel}
				>
					{#if settings.autoLoadMore}
						<div
							class={cn(
								'flex items-center justify-center text-xs text-fg-subtle',
								settings.compactLoadMore ? 'py-1' : 'py-2'
							)}
							aria-live="polite"
						>
							{#if loadingMore}
								<span class="z-spinner size-4" aria-hidden="true">
									<LoaderCircle class="size-full" />
								</span>
								<span class="ml-2">Loading…</span>
							{/if}
						</div>
					{:else}
						<Button variant="ghost" class="w-full" disabled={loadingMore} onclick={onLoadMore}>
							{#if loadingMore}
								<span class="z-spinner size-4" aria-hidden="true">
									<LoaderCircle class="size-full" />
								</span>
								Loading…
							{:else}
								Load more
							{/if}
						</Button>
					{/if}
				</div>
			{/if}
		{/if}
	</div>

	{#if showMobileSelectionBar && mailboxRouteId}
		<MessageListMobileBar {mailboxRouteId} {onBulkAction} />
	{/if}
</section>
