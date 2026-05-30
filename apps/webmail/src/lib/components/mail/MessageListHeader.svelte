<script lang="ts">
	import Archive from '$lib/components/icons/Archive.svelte';
	import Mail from '$lib/components/icons/Mail.svelte';
	import MailOpen from '$lib/components/icons/MailOpen.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MessageListMasterCheckbox from '$lib/components/mail/MessageListMasterCheckbox.svelte';
	import MessageListSelectMenu from '$lib/components/mail/MessageListSelectMenu.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';
	import { supportsMobileListGestures } from '$lib/utils/pointer-env';

	interface Props {
		mailboxRouteId?: string;
		disabled?: boolean;
		onBulkAction?: () => void;
	}

	let { mailboxRouteId, disabled = false, onBulkAction }: Props = $props();

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const currentMailbox = $derived(mailboxRouteId ? mail.mailboxByRouteId(mailboxRouteId) : null);
	const canArchive = $derived(mail.canArchiveFrom(currentMailbox));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Delete');
	const hasUnreadSelected = $derived(
		mail.messages.some((message) => selectedIds.includes(message.id) && message.unread)
	);
	const hasReadSelected = $derived(
		mail.messages.some((message) => selectedIds.includes(message.id) && !message.unread)
	);
	const moveTargets = $derived(
		mailboxRouteId
			? mail.mailboxes.filter((mb) => mb.jmapId && mb.id !== currentMailbox?.id)
			: []
	);
	const actionButtonClass = '!h-8 shrink-0 !px-2 !text-xs';
	const moveSelectClass = $derived(
		cn('z-select z-select--sm truncate', settings.compactListHeader && 'z-select--compact')
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
		if (!auth.client || !mailboxRouteId) return;
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
		<div class="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto max-md:hidden">
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
	{:else if !settings.hideSelectionHints}
		<p class="min-w-0 truncate text-xs text-fg-subtle max-md:hidden">
			Shift+click for a range · Ctrl+click to toggle
		</p>
		{#if supportsMobileListGestures()}
			<p class="min-w-0 truncate text-xs text-fg-subtle md:hidden">
				Hold to select · Swipe for actions
			</p>
		{/if}
	{/if}
</div>
