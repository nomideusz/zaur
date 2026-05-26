<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { ArrowLeft } from 'lucide-svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import MessageThreadActions from '$lib/components/mail/MessageThreadActions.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import type { MailHeaderContext } from '$lib/stores/shell-header.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		ctx: MailHeaderContext;
	}

	let { ctx }: Props = $props();

	const threadId = $derived($page.params.threadId);
	const thread = $derived(mail.selectedThread);
	const showThreadActions = $derived(
		!!threadId &&
			!!ctx.mailboxRouteId &&
			!mail.hasSelection &&
			thread.length > 0 &&
			!mail.selectedLoading
	);
	const displayMailboxName = $derived(
		ctx.mailboxName.startsWith('Search:') ? ctx.mailboxName.slice(8) : ctx.mailboxName
	);
	const folderInListHeader = $derived(
		settings.showBulkSelect && !!ctx.mailboxRouteId && !settings.hideListHeader
	);
</script>

<div class="flex min-w-0 flex-1 items-center gap-2">
	{#if ctx.onBack && threadId && !mail.hasSelection}
		<IconButton label="Back to list" class="md:hidden" onclick={ctx.onBack}>
			<ArrowLeft class="size-5" />
		</IconButton>
	{/if}

	{#if ctx.mailboxRouteId && !threadId && !mail.hasSelection}
		<label class="min-w-0 flex-1 md:hidden">
			<span class="sr-only">Folder</span>
			<select
				class={cn('z-input w-full', settings.compactMobileFolderPicker ? 'py-1' : 'py-1.5')}
				value={ctx.mailboxRouteId}
				onchange={(e) => goto(`/mail/${e.currentTarget.value}`)}
			>
				{#each mail.mailboxes as folder (folder.id)}
					<option value={folder.id}>
						{folder.name}{settings.showFolderUnreadCounts && folder.unread > 0
							? ` (${folder.unread})`
							: ''}
					</option>
				{/each}
			</select>
		</label>
	{/if}

	<div
		class={cn(
			'hidden min-w-0 items-baseline gap-2 md:flex',
			(settings.hideListHeader || folderInListHeader) && 'md:hidden'
		)}
	>
		<h2 class="z-type-pane-title truncate">{displayMailboxName}</h2>
		{#if settings.showMessageCounts}
			<span class="shrink-0 text-xs text-fg-subtle">{ctx.countLabel}</span>
		{/if}
	</div>

	{#if ctx.mailboxRouteId && !mail.hasSelection}
		<span class="shrink-0 text-xs text-fg-subtle md:hidden">
			{settings.showMessageCounts ? ctx.countLabel : displayMailboxName}
		</span>
	{/if}

	{#if showThreadActions && ctx.mailboxRouteId}
		<MessageThreadActions
			{thread}
			mailboxRouteId={ctx.mailboxRouteId}
			onMoved={ctx.onBulkAction}
			class="min-w-0 flex-1 overflow-x-auto md:hidden"
		/>
	{/if}
</div>
