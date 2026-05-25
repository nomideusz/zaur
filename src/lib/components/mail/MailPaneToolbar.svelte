<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		Archive,
		ArrowLeft,
		FolderInput,
		Mail,
		MailOpen,
		PenSquare,
		Trash2,
		X
	} from 'lucide-svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import MessageListMasterCheckbox from '$lib/components/mail/MessageListMasterCheckbox.svelte';
	import MessageThreadActions from '$lib/components/mail/MessageThreadActions.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		mailboxName: string;
		countLabel: string;
		mailboxRouteId?: string;
		loading?: boolean;
		error?: string | null;
		messageCount?: number;
		onBulkAction?: () => void;
		onBack?: () => void;
		showNewMessage?: boolean;
	}

	let {
		mailboxName,
		countLabel,
		mailboxRouteId,
		loading = false,
		error = null,
		messageCount = 0,
		onBulkAction,
		onBack,
		showNewMessage = true
	}: Props = $props();

	let moveOpen = $state(false);

	const threadId = $derived($page.params.threadId);
	const thread = $derived(mail.selectedThread);
	const selectedIds = $derived([...mail.selectedMessageIds]);
	const showBulkToolbar = $derived(
		!!mailboxRouteId &&
			!loading &&
			!error &&
			messageCount > 0 &&
			settings.showBulkSelect
	);
	const showThreadActions = $derived(
		!!threadId &&
			!!mailboxRouteId &&
			!mail.selectionMode &&
			thread.length > 0 &&
			!mail.selectedLoading
	);

	const currentMailbox = $derived(mailboxRouteId ? mail.mailboxByRouteId(mailboxRouteId) : null);
	const moveTargets = $derived(
		mail.mailboxes.filter((mb) => mb.jmapId && mb.id !== currentMailbox?.id)
	);
	const canArchive = $derived(currentMailbox?.role !== 'archive');
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Delete');
	const hasUnreadSelected = $derived(
		mail.messages.some((message) => selectedIds.includes(message.id) && message.unread)
	);
	const hasReadSelected = $derived(
		mail.messages.some((message) => selectedIds.includes(message.id) && !message.unread)
	);

	async function runBulk(action: () => Promise<void>) {
		if (!auth.client || mail.bulkActionLoading) return;
		try {
			await action();
			onBulkAction?.();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Bulk action failed';
			toast.show(message, 'error');
		}
	}
</script>

<svelte:window onclick={() => (moveOpen = false)} />

<header
	class={cn(
		'z-mail-pane-toolbar flex shrink-0 items-center gap-2 px-4',
		settings.compactListHeader ? 'h-10' : 'h-12',
		!settings.hidePaneBorders && 'border-b border-border'
	)}
>
	{#if showBulkToolbar}
		<MessageListMasterCheckbox />
	{/if}

	{#if onBack && threadId}
		<IconButton label="Back to list" class="!p-1.5 md:hidden" onclick={onBack}>
			<ArrowLeft class="size-3.5" />
		</IconButton>
	{/if}

	{#if mail.selectionMode && mailboxRouteId}
		<IconButton label="Cancel selection" class="!p-1.5" onclick={() => mail.exitSelectionMode()}>
			<X class="size-3.5" />
		</IconButton>
		<span class="min-w-0 truncate text-xs text-fg-muted">
			{selectedIds.length} selected
		</span>
		{#if selectedIds.length}
			<div class={cn('flex shrink-0 items-center', settings.compactReaderToolbar ? 'gap-0' : 'gap-0.5')}>
				{#if hasUnreadSelected}
					<IconButton
						label="Mark read"
						class="!p-1.5"
						onclick={() => auth.client && runBulk(() => mail.bulkMarkAsRead(auth.client!))}
					>
						<MailOpen class="size-3.5" aria-hidden="true" />
					</IconButton>
				{/if}
				{#if hasReadSelected}
					<IconButton
						label="Mark unread"
						class="!p-1.5"
						onclick={() => auth.client && runBulk(() => mail.bulkMarkAsUnread(auth.client!))}
					>
						<Mail class="size-3.5" aria-hidden="true" />
					</IconButton>
				{/if}
				{#if canArchive}
					<IconButton
						label="Archive"
						class="!p-1.5"
						onclick={() => auth.client && runBulk(() => mail.bulkArchive(auth.client!))}
					>
						<Archive class="size-3.5" aria-hidden="true" />
					</IconButton>
				{/if}
				<div class="relative">
					<IconButton
						label="Move"
						class="!p-1.5"
						onclick={(e) => {
							e.stopPropagation();
							moveOpen = !moveOpen;
						}}
					>
						<FolderInput class="size-3.5" aria-hidden="true" />
					</IconButton>
					{#if moveOpen}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="absolute left-0 z-20 mt-1 max-h-64 w-52 overflow-y-auto rounded-md border border-border bg-surface-raised py-1 shadow-md"
							onpointerdown={(e) => e.stopPropagation()}
						>
							{#if !settings.hideMoveMenuLabels}
								<p class={cn('px-3 text-xs font-medium text-fg-subtle', settings.compactMoveMenu ? 'py-1' : 'py-1.5')}>
									Move to
								</p>
							{/if}
							{#each moveTargets as folder (folder.id)}
								<button
									type="button"
									class={cn(
										'block w-full truncate px-3 text-left text-sm text-fg hover:bg-surface-sunken',
										settings.compactMoveMenu ? 'py-1.5' : 'py-2'
									)}
									onclick={() => {
										moveOpen = false;
										if (auth.client) void runBulk(() => mail.bulkMoveToMailbox(auth.client!, folder.id));
									}}
								>
									{folder.name}
								</button>
							{/each}
						</div>
					{/if}
				</div>
				<IconButton
					label={deleteLabel}
					class="!p-1.5 text-danger hover:bg-danger/10"
					onclick={() => {
						if (!auth.client) return;
						const permanent = currentMailbox?.role === 'trash';
						if (!settings.confirmDeleteMessage(selectedIds.length, permanent)) return;
						void runBulk(() => mail.bulkDelete(auth.client!, mailboxRouteId!));
					}}
				>
					<Trash2 class="size-3.5" aria-hidden="true" />
				</IconButton>
			</div>
		{:else if !settings.hideSelectionHints}
			<span class="hidden truncate text-xs text-fg-subtle sm:inline">Ctrl/Shift+click</span>
		{/if}
	{:else}
		{#if mailboxRouteId && !threadId}
			<label class="min-w-0 flex-1 md:hidden">
				<span class="sr-only">Folder</span>
				<select
					class={cn('z-input w-full', settings.compactMobileFolderPicker ? 'py-1' : 'py-1.5')}
					value={mailboxRouteId}
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
		<h2
			class={cn(
				'z-type-pane-title hidden min-w-0 truncate md:block',
				settings.hideListHeader && 'md:hidden'
			)}
		>
			{mailboxName.startsWith('Search:') ? mailboxName.slice(8) : mailboxName}
		</h2>
		<span
			class={cn(
				'hidden shrink-0 text-xs text-fg-subtle md:inline',
				settings.hideListHeader && 'md:hidden',
				!settings.showMessageCounts && 'md:hidden'
			)}
		>{countLabel}</span>
		{#if mailboxRouteId && !showThreadActions}
			<span class="ml-auto shrink-0 text-xs text-fg-subtle md:hidden">{settings.showMessageCounts ? countLabel : ''}</span>
		{/if}

		<div class="ml-auto flex shrink-0 items-center gap-0.5">
			{#if showThreadActions && mailboxRouteId}
				<MessageThreadActions {thread} {mailboxRouteId} onMoved={onBulkAction} />
			{/if}
			{#if showNewMessage}
				<IconButton label="New message" class="!p-1.5" onclick={() => goto('/mail/compose')}>
					<PenSquare class="size-3.5" />
				</IconButton>
			{/if}
		</div>
	{/if}
</header>
