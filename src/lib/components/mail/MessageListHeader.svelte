<script lang="ts">
	import { Archive, Mail, MailOpen, Trash2 } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MessageListMasterCheckbox from '$lib/components/mail/MessageListMasterCheckbox.svelte';
	import MessageListSelectMenu from '$lib/components/mail/MessageListSelectMenu.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		mailboxName: string;
		mailboxRouteId: string;
		countLabel?: string;
		disabled?: boolean;
		onBulkAction?: () => void;
	}

	let { mailboxName, mailboxRouteId, countLabel, disabled = false, onBulkAction }: Props = $props();

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const displayMailboxName = $derived(
		mailboxName.startsWith('Search:') ? mailboxName.slice(8) : mailboxName
	);
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const canArchive = $derived(mail.canArchiveFrom(currentMailbox));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Delete');
	const hasUnreadSelected = $derived(
		mail.messages.some((message) => selectedIds.includes(message.id) && message.unread)
	);
	const hasReadSelected = $derived(
		mail.messages.some((message) => selectedIds.includes(message.id) && !message.unread)
	);
	const moveTargets = $derived(
		mail.mailboxes.filter((mb) => mb.jmapId && mb.id !== currentMailbox?.id)
	);
	const actionButtonClass = '!h-8 shrink-0 !px-2 !text-xs';
	const moveSelectClass = $derived(
		cn(
			'z-input h-8 max-w-[9rem] shrink-0 truncate py-0 pl-2 pr-7 text-xs',
			settings.compactListHeader && 'max-w-[8rem]'
		)
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

	function deleteSelected() {
		if (!auth.client) return;
		const permanent = currentMailbox?.role === 'trash';
		if (!settings.confirmDeleteMessage(selectedIds.length, permanent)) return;
		void runBulk(() => mail.bulkDelete(auth.client!, mailboxRouteId));
	}

	function handleMove(event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		const targetRouteId = select.value;
		if (!targetRouteId || !auth.client) return;
		void runBulk(() => mail.bulkMoveToMailbox(auth.client!, targetRouteId));
		select.value = '';
	}
</script>

<div
	class={cn(
		'z-mail-list-header',
		settings.compactListHeader && 'z-mail-list-header--compact',
		disabled && 'pointer-events-none opacity-60'
	)}
>
	<div class="flex shrink-0 items-center gap-0.5">
		<MessageListMasterCheckbox />
		<MessageListSelectMenu {disabled} />
	</div>

	{#if mail.hasSelection && !disabled}
		<div class="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
			<span class="shrink-0 text-sm font-medium text-fg">{selectedIds.length} selected</span>
			{#if hasUnreadSelected}
				<Button
					variant="ghost"
					class={actionButtonClass}
					onclick={() => auth.client && runBulk(() => mail.bulkMarkAsRead(auth.client!))}
				>
					<MailOpen class="size-3.5" aria-hidden="true" />
					Mark read
				</Button>
			{/if}
			{#if hasReadSelected}
				<Button
					variant="ghost"
					class={actionButtonClass}
					onclick={() => auth.client && runBulk(() => mail.bulkMarkAsUnread(auth.client!))}
				>
					<Mail class="size-3.5" aria-hidden="true" />
					Mark unread
				</Button>
			{/if}
			{#if canArchive}
				<Button
					variant="ghost"
					class={actionButtonClass}
					onclick={() => auth.client && runBulk(() => mail.bulkArchive(auth.client!))}
				>
					<Archive class="size-3.5" aria-hidden="true" />
					Archive
				</Button>
			{/if}
			{#if moveTargets.length}
				<label class="sr-only" for="bulk-move-select">Move selected messages</label>
				<select
					id="bulk-move-select"
					class={moveSelectClass}
					value=""
					onchange={handleMove}
				>
					<option value="" disabled>Move to…</option>
					{#each moveTargets as mailbox (mailbox.id)}
						<option value={mailbox.id}>{mailbox.name}</option>
					{/each}
				</select>
			{/if}
			<Button variant="danger" class={actionButtonClass} onclick={deleteSelected}>
				<Trash2 class="size-3.5" aria-hidden="true" />
				{deleteLabel}
			</Button>
		</div>
	{:else if !settings.hideListHeader}
		<div class="flex min-w-0 items-baseline gap-2">
			<h2 class="z-type-pane-title truncate">{displayMailboxName}</h2>
			{#if settings.showMessageCounts && countLabel}
				<span class="shrink-0 text-xs text-fg-subtle">{countLabel}</span>
			{/if}
		</div>
		{#if !settings.hideSelectionHints}
			<span class="ml-auto hidden truncate text-xs text-fg-subtle lg:inline">
				Shift+click to select a range
			</span>
		{/if}
	{:else if !settings.hideSelectionHints}
		<span class="truncate text-xs text-fg-subtle">Shift+click to select a range</span>
	{/if}
</div>
