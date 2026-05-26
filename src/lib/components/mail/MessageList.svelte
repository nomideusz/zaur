<script lang="ts">
	import { LoaderCircle, Inbox, Search } from 'lucide-svelte';
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
				return 'Your inbox is empty';
			case 'drafts':
				return 'No drafts';
			case 'sent':
				return 'No sent messages';
			case 'trash':
				return 'Trash is empty';
			case 'archive':
				return 'Archive is empty';
			case 'junk':
				return 'No junk mail';
			default:
				return 'No messages here';
		}
	});

	const defaultEmptyHint = $derived.by(() => {
		switch (mailboxRouteId) {
			case 'inbox':
				return 'New mail will show up here when it arrives.';
			case 'drafts':
				return 'Saved drafts and unfinished messages appear here.';
			case 'sent':
				return 'Messages you send will appear here.';
			case 'trash':
				return 'Deleted messages are kept here until emptied.';
			default:
				return null;
		}
	});
</script>

<section
	class={cn(
		'flex min-h-0 w-full max-w-none flex-1 shrink-0 flex-col bg-surface-raised md:flex-none',
		!settings.hidePaneBorders && 'border-r border-border',
		expanded ? 'md:w-auto md:max-w-none md:flex-1' : 'md:w-(--width-list) md:max-w-(--width-list)',
		hideOnMobile ? 'hidden md:flex' : 'flex'
	)}
	style="view-transition-name: message-list;"
	aria-label="{mailboxName} messages"
>
	<div class="z-pane-scroll min-h-0 flex-1 overflow-y-auto">
		{#if loading}
			{#if settings.loadingIndicatorStyle === 'skeleton'}
			<div class={cn(!settings.hideListRowDividers && 'divide-y divide-border')} aria-busy="true" aria-label="Loading messages">
				{#each Array(settings.compactListLoadingSkeleton ? 4 : 6) as _, index (index)}
					<div
						class={cn(
							'z-list-row flex items-start gap-3 px-3',
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
					settings.compactListErrorState ? 'gap-2 px-4 py-8' : 'gap-3 px-4 py-12'
				)}
			>
				<p class="text-sm text-danger">{error}</p>
				{#if onRetry && !settings.hideListErrorRetry}
					<Button variant="ghost" class="text-sm" onclick={onRetry}>Try again</Button>
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
					<div class={cn('rounded-full bg-surface-sunken', settings.compactListEmptyState ? 'p-3' : 'p-4')}>
						{#if emptyIcon === 'search'}
							<Search class={cn('text-fg-subtle', settings.compactListEmptyState ? 'size-6' : 'size-8')} aria-hidden="true" />
						{:else}
							<Inbox class={cn('text-fg-subtle', settings.compactListEmptyState ? 'size-6' : 'size-8')} aria-hidden="true" />
						{/if}
					</div>
				{/if}
				<div>
					<p class="text-sm font-medium text-fg">
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
					href={mailboxRouteId === 'drafts'
						? `/mail/compose?draft=${message.id}`
						: `/mail/${message.mailboxId}/${message.threadId}`}
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
