<script lang="ts">
	import { goto } from '$app/navigation';
	import { LoaderCircle, Inbox, Search } from 'lucide-svelte';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	import MessageListItem from './MessageListItem.svelte';
	import MessageListToolbar from './MessageListToolbar.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import type { MessagePreview } from '$lib/types/mail';

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
		onLoadMore,
		onRetry,
		onBulkAction
	}: Props = $props();

	const activeThreadId = $derived($page.params.threadId);
	const mailbox = $derived(mailboxRouteId ? mail.mailboxByRouteId(mailboxRouteId) : null);
	const countLabel = $derived.by(() => {
		const totalCount = total ?? messages.length;
		const unread = mailbox?.unread ?? 0;
		if (unread > 0) return `${unread} unread · ${totalCount}`;
		return String(totalCount);
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
	class="z-panel flex min-h-0 w-full max-w-none flex-1 shrink-0 flex-col border-r md:max-w-(--width-list) md:flex-none md:w-(--width-list) {hideOnMobile ? 'hidden md:flex' : 'flex'}"
	style="view-transition-name: message-list;"
	aria-label="{mailboxName} messages"
>
	<div class="flex h-12 items-center gap-2 border-b border-border px-4">
		{#if mailboxRouteId}
			<label class="min-w-0 flex-1 md:hidden">
				<span class="sr-only">Folder</span>
				<select
					class="z-input w-full py-1.5 text-sm"
					value={mailboxRouteId}
					onchange={(e) => goto(`/mail/${e.currentTarget.value}`)}
				>
					{#each mail.mailboxes as folder (folder.id)}
						<option value={folder.id}>
							{folder.name}{folder.unread > 0 ? ` (${folder.unread})` : ''}
						</option>
					{/each}
				</select>
			</label>
		{/if}
		<h2 class="hidden truncate text-sm font-semibold text-fg md:block">
			{mailboxName.startsWith('Search:') ? mailboxName.slice(8) : mailboxName}
		</h2>
		<span class="hidden shrink-0 text-xs text-fg-subtle md:inline">{countLabel}</span>
		{#if mailboxRouteId}
			<span class="ml-auto shrink-0 text-xs text-fg-subtle md:ml-2 md:hidden">{countLabel}</span>
		{:else}
			<span class="ml-2 shrink-0 text-xs text-fg-subtle">{countLabel}</span>
		{/if}
	</div>

	{#if mailboxRouteId && !loading && !error && messages.length}
		<MessageListToolbar {mailboxRouteId} {onBulkAction} />
	{/if}

	<div class="flex-1 overflow-y-auto">
		{#if loading}
			<div class="divide-y divide-border" aria-busy="true" aria-label="Loading messages">
				{#each Array(6) as _, index (index)}
					<div class="z-list-row flex items-start gap-3 px-3 py-2.5">
						<div class="mt-0.5 size-8 shrink-0 animate-pulse rounded-full bg-surface-sunken"></div>
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
		{:else if error}
			<div class="flex flex-col items-center gap-3 px-4 py-12 text-center">
				<p class="text-sm text-danger">{error}</p>
				{#if onRetry}
					<Button variant="ghost" class="text-sm" onclick={onRetry}>Try again</Button>
				{/if}
			</div>
		{:else if messages.length === 0}
			<div class="flex flex-col items-center gap-4 px-6 py-16 text-center">
				{#if emptyIcon !== 'none'}
					<div class="rounded-full bg-surface-sunken p-4">
						{#if emptyIcon === 'search'}
							<Search class="size-8 text-fg-subtle" aria-hidden="true" />
						{:else}
							<Inbox class="size-8 text-fg-subtle" aria-hidden="true" />
						{/if}
					</div>
				{/if}
				<div>
					<p class="text-sm font-medium text-fg">
						{emptyMessage ?? defaultEmptyMessage}
					</p>
					{#if emptyHint}
						<p class="mx-auto mt-1 max-w-xs text-xs text-fg-muted">{emptyHint}</p>
					{:else if !emptyMessage && defaultEmptyHint}
						<p class="mx-auto mt-1 max-w-xs text-xs text-fg-muted">{defaultEmptyHint}</p>
					{/if}
				</div>
				{#if emptyActionHref && emptyActionLabel}
					<Button href={emptyActionHref} variant="ghost" class="text-sm">{emptyActionLabel}</Button>
				{:else if mailboxRouteId === 'inbox' || mailboxRouteId === 'drafts'}
					<Button href="/mail/compose" variant="ghost" class="text-sm">Write a message</Button>
				{/if}
			</div>
		{:else}
			{#each messages as message (message.id)}
				<MessageListItem
					{message}
					href="/mail/{message.mailboxId}/{message.threadId}"
					active={activeThreadId === message.threadId}
					selectionMode={mailboxRouteId ? mail.selectionMode : false}
					selected={mailboxRouteId ? mail.selectedMessageIds.has(message.id) : false}
					onToggleSelect={
						mailboxRouteId ? () => mail.toggleMessageSelection(message.id) : undefined
					}
				/>
			{/each}

			{#if hasMore && onLoadMore}
				<div class="border-t border-border px-4 py-3">
					<Button variant="ghost" class="w-full" disabled={loadingMore} onclick={onLoadMore}>
						{#if loadingMore}
							<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
							Loading…
						{:else}
							Load more
						{/if}
					</Button>
				</div>
			{/if}
		{/if}
	</div>
</section>
