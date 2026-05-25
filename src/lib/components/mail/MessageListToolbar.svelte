<script lang="ts">
	import { goto } from '$app/navigation';
	import { Archive, FolderInput, Mail, MailOpen, Trash2, X } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MessageListMasterCheckbox from '$lib/components/mail/MessageListMasterCheckbox.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		mailboxRouteId: string;
		countLabel?: string;
		onBulkAction?: () => void;
	}

	let { mailboxRouteId, countLabel = '', onBulkAction }: Props = $props();

	let moveOpen = $state(false);

	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const moveTargets = $derived(
		mail.mailboxes.filter((mb) => mb.jmapId && mb.id !== currentMailbox?.id)
	);
	const canArchive = $derived(currentMailbox?.role !== 'archive');
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Delete');
	const hasUnreadSelected = $derived(
		mail.messages.some((message) => mail.selectedMessageIds.has(message.id) && message.unread)
	);
	const hasReadSelected = $derived(
		mail.messages.some((message) => mail.selectedMessageIds.has(message.id) && !message.unread)
	);

	async function run(action: () => Promise<void>) {
		if (!auth.client || mail.bulkActionLoading) return;

		try {
			await action();
			onBulkAction?.();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Bulk action failed';
			toast.show(message, 'error');
		}
	}

	async function archiveSelected() {
		if (!auth.client) return;
		await run(() => mail.bulkArchive(auth.client!));
	}

	async function deleteSelected() {
		if (!auth.client) return;
		const count = mail.selectedCount;
		const permanent = currentMailbox?.role === 'trash';
		if (!settings.confirmDeleteMessage(count, permanent)) return;
		await run(() => mail.bulkDelete(auth.client!, mailboxRouteId));
	}

	async function moveSelected(targetRouteId: string) {
		moveOpen = false;
		if (!auth.client) return;
		await run(() => mail.bulkMoveToMailbox(auth.client!, targetRouteId));
	}

	async function markSelectedRead() {
		if (!auth.client) return;
		await run(() => mail.bulkMarkAsRead(auth.client!));
	}

	async function markSelectedUnread() {
		if (!auth.client) return;
		await run(() => mail.bulkMarkAsUnread(auth.client!));
	}
</script>

<svelte:window onclick={() => (moveOpen = false)} />

	<div
		class={cn(
			'flex shrink-0 flex-wrap items-center gap-2 px-4',
			settings.compactBulkToolbar ? 'min-h-10 py-1.5' : 'min-h-12 py-2',
			!settings.hidePaneBorders && 'border-b border-border',
			!mail.selectionMode && 'md:hidden'
		)}
	>
		<MessageListMasterCheckbox class="hidden shrink-0 md:block" />

	<label class={cn('min-w-0 flex-1 md:hidden', mail.selectionMode && 'hidden')}>
		<span class="sr-only">Folder</span>
		<select
			class={cn('z-input w-full min-w-0', settings.compactMobileFolderPicker ? 'py-1' : 'py-1.5')}
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

	{#if mail.selectionMode}
		<span class="min-w-0 flex-1 truncate text-xs text-fg-muted md:hidden">
			{currentMailbox?.name ?? 'Folder'}
		</span>
	{/if}

	{#if !mail.selectionMode && settings.showMessageCounts && countLabel}
		<span class="shrink-0 text-xs text-fg-subtle md:hidden">{countLabel}</span>
	{/if}

	{#if mail.selectionMode}
		<Button variant="ghost" class="!px-2 !py-1.5 text-xs" onclick={() => mail.exitSelectionMode()}>
			<X class="size-3.5" aria-hidden="true" />
			Cancel
		</Button>
		<span class="text-xs text-fg-muted">
			{mail.selectedCount} selected
		</span>
		{#if !mail.selectedCount && !settings.hideSelectionHints}
			<span class="hidden text-xs text-fg-subtle sm:inline">Click messages to select</span>
		{/if}

		{#if mail.selectedCount}
			<div class="flex w-full flex-wrap items-center gap-1 md:ml-auto md:w-auto">
				{#if hasUnreadSelected}
					<Button
						variant="ghost"
						class="!px-2 !py-1.5 text-xs"
						disabled={mail.bulkActionLoading}
						onclick={markSelectedRead}
					>
						<MailOpen class="size-3.5" aria-hidden="true" />
						<span class={settings.iconOnlyBulkActions ? 'sr-only' : ''}>Mark read</span>
					</Button>
				{/if}
				{#if hasReadSelected}
					<Button
						variant="ghost"
						class="!px-2 !py-1.5 text-xs"
						disabled={mail.bulkActionLoading}
						onclick={markSelectedUnread}
					>
						<Mail class="size-3.5" aria-hidden="true" />
						<span class={settings.iconOnlyBulkActions ? 'sr-only' : ''}>Mark unread</span>
					</Button>
				{/if}
				{#if canArchive}
					<Button
						variant="ghost"
						class="!px-2 !py-1.5 text-xs"
						disabled={mail.bulkActionLoading}
						onclick={archiveSelected}
					>
						<Archive class="size-3.5" aria-hidden="true" />
						<span class={settings.iconOnlyBulkActions ? 'sr-only' : ''}>Archive</span>
					</Button>
				{/if}

				<div class="relative">
					<Button
						variant="ghost"
						class="!px-2 !py-1.5 text-xs"
						disabled={mail.bulkActionLoading}
						onclick={(e) => {
							e.stopPropagation();
							moveOpen = !moveOpen;
						}}
					>
						<FolderInput class="size-3.5" aria-hidden="true" />
						<span class={settings.iconOnlyBulkActions ? 'sr-only' : ''}>Move</span>
					</Button>

					{#if moveOpen}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="absolute right-0 z-20 mt-1 max-h-64 w-52 overflow-y-auto rounded-md border border-border bg-surface-raised py-1 shadow-md"
							onpointerdown={(e) => e.stopPropagation()}
						>
							{#if !settings.hideMoveMenuLabels}
								<p
									class={cn(
										'px-3 text-xs font-medium text-fg-subtle',
										settings.compactMoveMenu ? 'py-1' : 'py-1.5'
									)}
								>
									Move to
								</p>
							{/if}
							{#each moveTargets as mailbox (mailbox.id)}
								<button
									type="button"
									class={cn(
										'block w-full truncate px-3 text-left text-sm text-fg hover:bg-surface-sunken',
										settings.compactMoveMenu ? 'py-1.5' : 'py-2'
									)}
									onclick={() => moveSelected(mailbox.id)}
								>
									{mailbox.name}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<Button
					variant="danger"
					class="!px-2 !py-1.5 text-xs"
					disabled={mail.bulkActionLoading}
					onclick={deleteSelected}
				>
					<Trash2 class="size-3.5" aria-hidden="true" />
					<span class={settings.iconOnlyBulkActions ? 'sr-only' : ''}>{deleteLabel}</span>
				</Button>
			</div>
		{/if}
	{/if}
</div>
