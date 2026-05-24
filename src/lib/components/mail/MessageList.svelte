<script lang="ts">
	import { goto } from '$app/navigation';
	import { LoaderCircle } from 'lucide-svelte';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	import MessageListItem from './MessageListItem.svelte';
	import MessageListToolbar from './MessageListToolbar.svelte';
	import { mail } from '$lib/stores/mail.svelte';
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
		emptyActionHref?: string;
		emptyActionLabel?: string;
		hideOnMobile?: boolean;
		onLoadMore?: () => void;
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
		emptyActionHref,
		emptyActionLabel,
		hideOnMobile = false,
		onLoadMore,
		onBulkAction
	}: Props = $props();

	const activeThreadId = $derived($page.params.threadId);
	const countLabel = $derived(total ?? messages.length);
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
						<option value={folder.id}>{folder.name}</option>
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
			<div class="flex items-center gap-2 px-4 py-8 text-sm text-fg-muted">
				<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
				Loading messages…
			</div>
		{:else if error}
			<p class="px-4 py-8 text-center text-sm text-danger">{error}</p>
		{:else if messages.length === 0}
			<div class="flex flex-col items-center gap-3 px-6 py-12 text-center">
				<p class="text-sm text-fg-muted">
					{emptyMessage ??
						(mailboxRouteId === 'inbox' ? 'Your inbox is empty.' : 'No messages in this folder.')}
				</p>
				{#if emptyActionHref && emptyActionLabel}
					<Button href={emptyActionHref} variant="ghost" class="text-sm">{emptyActionLabel}</Button>
				{:else if mailboxRouteId === 'inbox'}
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
