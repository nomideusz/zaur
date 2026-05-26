<script lang="ts">
	import { AlertCircle, LoaderCircle, Inbox, RefreshCw, Search } from 'lucide-svelte';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';
	import MessageListItem from './MessageListItem.svelte';
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
		onRetry
	}: Props = $props();

	let loadSentinel = $state<HTMLDivElement | null>(null);

	const activeThreadId = $derived($page.params.threadId);
	const searchReturnTo = $derived.by(() => {
		if ($page.url.pathname !== '/mail/search') return null;
		return `${$page.url.pathname}${$page.url.search}`;
	});
	const activeMessageId = $derived.by(() => {
		if (!activeThreadId) return null;
		return (
			messages.find((message) => message.threadId === activeThreadId)?.id ??
			mail.messages.find((message) => message.threadId === activeThreadId)?.id ??
			null
		);
	});
	const selectedIds = $derived([...mail.selectedMessageIds]);
	$effect(() => {
		if (!settings.showBulkSelect && mail.selectionMode) {
			mail.exitSelectionMode();
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
		if (mailboxRouteId === 'drafts') return `/mail/compose?draft=${message.id}`;
		const href = `/mail/${message.mailboxId}/${message.threadId}`;
		return searchReturnTo ? `${href}?returnTo=${encodeURIComponent(searchReturnTo)}` : href;
	}

</script>

<section
	class={cn(
		'm-2 flex min-h-0 w-[calc(100%-1rem)] max-w-none flex-1 shrink-0 flex-col overflow-hidden rounded-lg bg-surface-raised/90 shadow-sm md:m-3 md:mr-0 md:w-[calc(100%-1.5rem)] md:flex-none',
		!settings.hidePaneBorders && 'border border-border',
		expanded ? 'md:w-auto md:max-w-none md:flex-1' : 'md:w-(--width-list) md:max-w-(--width-list)',
		hideOnMobile ? 'hidden md:flex' : 'flex'
	)}
	style="view-transition-name: message-list;"
	aria-label="{mailboxName} messages"
>
	<div class="z-pane-scroll min-h-0 flex-1 overflow-y-auto">
		{#if loading}
			{#if settings.loadingIndicatorStyle === 'skeleton'}
			<div class="p-1.5" aria-busy="true" aria-label="Loading messages">
				{#each Array(settings.compactListLoadingSkeleton ? 4 : 6) as _, index (index)}
					<div
						class={cn(
							'z-list-row flex items-start gap-3 rounded-md px-3',
							settings.compactListLoadingSkeleton ? 'py-2' : 'py-2.5'
						)}
					>
						{#if settings.showAvatars}
							<div class={cn('shrink-0 animate-pulse rounded-full bg-surface-sunken', settings.compactListAvatars ? 'mt-0.5 size-7' : 'mt-0.5 size-8')}></div>
						{:else}
							<div class="mt-2 size-2 shrink-0"></div>
						{/if}
						<div class="min-w-0 flex-1 space-y-2 py-1">
							<div class="flex items-center justify-between gap-2">
								<div class="h-3.5 w-28 animate-pulse rounded bg-surface-sunken"></div>
								<div class="h-3 w-10 shrink-0 animate-pulse rounded bg-surface-sunken"></div>
							</div>
							<div class="h-3.5 w-4/5 animate-pulse rounded bg-surface-sunken"></div>
							{#if settings.showListPreview}
								<div class="h-3 w-full animate-pulse rounded bg-surface-sunken"></div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
			{:else}
				<LoadingIndicator label="Loading messages…" />
			{/if}
		{:else if error}
			<div
				class={cn(
					'flex flex-col items-center text-center',
					settings.compactListErrorState ? 'gap-2 px-4 py-8' : 'gap-3 px-5 py-12'
				)}
			>
				<div class={cn('rounded-full bg-danger/10 text-danger', settings.compactListErrorState ? 'p-2.5' : 'p-3')}>
					<AlertCircle class={cn(settings.compactListErrorState ? 'size-5' : 'size-6')} aria-hidden="true" />
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
					<div class={cn('rounded-full bg-accent/10 text-accent', settings.compactListEmptyState ? 'p-3' : 'p-4')}>
						{#if emptyIcon === 'search'}
							<Search class={cn(settings.compactListEmptyState ? 'size-6' : 'size-8')} aria-hidden="true" />
						{:else}
							<Inbox class={cn(settings.compactListEmptyState ? 'size-6' : 'size-8')} aria-hidden="true" />
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
					active={activeThreadId === message.threadId}
					selectionMode={mailboxRouteId ? mail.selectionMode : false}
					selected={mailboxRouteId ? selectedIds.includes(message.id) : false}
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
</section>
