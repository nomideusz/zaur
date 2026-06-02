<script lang="ts">
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import MessageListBulkMoreMenu from '$lib/components/mail/MessageListBulkMoreMenu.svelte';
	import {
		bulkSelectionCounts,
		bulkSelectionSummary
	} from '$lib/components/mail/bulk-selection-label';
	import MessageListMasterCheckbox from '$lib/components/mail/MessageListMasterCheckbox.svelte';
	import MessageListSelectMenu from '$lib/components/mail/MessageListSelectMenu.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import { moveTargetMailboxes } from '$lib/mail/mailboxes';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		mailboxRouteId?: string;
		disabled?: boolean;
		onBulkAction?: () => void;
	}

	let { mailboxRouteId, disabled = false, onBulkAction }: Props = $props();

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const selectedCount = $derived(selectedIds.length);
	const selectedMessages = $derived(mail.selectedMessages());
	const currentMailbox = $derived(mailboxRouteId ? mail.mailboxByRouteId(mailboxRouteId) : null);
	const canMarkImportant = $derived(mail.canMarkImportantInMailbox(currentMailbox));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Trash');
	const moveTargets = $derived(
		mailboxRouteId ? moveTargetMailboxes(mail.mailboxes, currentMailbox) : []
	);
	const selectionCounts = $derived(bulkSelectionCounts(selectedMessages, selectedIds));
	const unresolvedCount = $derived(Math.max(0, selectedCount - selectedMessages.length));
	const selectionSummary = $derived(
		bulkSelectionSummary(selectedCount, selectionCounts, unresolvedCount)
	);
	const hasMenuActions = $derived(
		selectionCounts.new > 0 ||
			selectionCounts.normal > 0 ||
			(canMarkImportant &&
				(selectionCounts.notImportant > 0 || selectionCounts.important > 0)) ||
			moveTargets.length > 0
	);
	const actionButtonClass = '!h-8 shrink-0 !px-2 !text-xs';

	async function runBulk(action: () => Promise<void>, refreshList = false) {
		if (!auth.client || mail.bulkActionLoading) return;
		try {
			await action();
			if (refreshList) onBulkAction?.();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Bulk action failed';
			toast.show(message, 'error');
		}
	}

	function deleteSelected() {
		if (!auth.client || !mailboxRouteId) return;
		const permanent = currentMailbox?.role === 'trash';
		if (!settings.confirmDeleteMessage(selectedIds.length, permanent)) return;
		void runBulk(() => mail.bulkDelete(auth.client!, mailboxRouteId), true);
	}

	function handleBulkMove(targetRouteId: string) {
		if (!auth.client) return;
		void runBulk(() => mail.bulkMoveToMailbox(auth.client!, targetRouteId), true);
	}
</script>

<div
	class={cn(
		'z-mail-list-header',
		disabled && 'pointer-events-none opacity-60'
	)}
>
	<div class="flex shrink-0 items-center gap-0.5">
		<MessageListMasterCheckbox />
		<MessageListSelectMenu {disabled} />
	</div>

	{#if mail.hasSelection && !disabled}
		<div class="z-mail-list-header__selection max-md:hidden">
			<p class="z-mail-list-bulk-bar__summary">
				<span class="z-mail-list-bulk-bar__headline">{selectionSummary.headline}</span>
				{#if selectionSummary.detail}
					<span class="z-mail-list-bulk-bar__detail"> · {selectionSummary.detail}</span>
				{/if}
			</p>
			<Button variant="danger" class={actionButtonClass} onclick={deleteSelected}>
				<Trash2 class="size-3.5" aria-hidden="true" />
				{deleteLabel}
			</Button>
			{#if hasMenuActions && mailboxRouteId}
				<OverflowMenu
					label="More actions"
					menuId="bulk-more-menu-header"
					placement="auto"
					menuClass="z-overflow-menu--list"
					triggerText="Actions"
					textTrigger
					triggerClass="z-mail-text-nav__action"
				>
					<MessageListBulkMoreMenu
						mailboxRouteId={mailboxRouteId}
						selectedCount={selectedCount}
						counts={selectionCounts}
						{canMarkImportant}
						onDone={() => auth.client && runBulk(() => mail.bulkMarkAsDone(auth.client!), true)}
						onMarkNew={() => auth.client && runBulk(() => mail.bulkMarkAsNew(auth.client!), true)}
						onMarkImportant={() => auth.client && runBulk(() => mail.bulkMarkAsImportant(auth.client!))}
						onRemoveImportant={() =>
							auth.client && runBulk(() => mail.bulkMarkAsNotImportant(auth.client!))}
						onMove={handleBulkMove}
					/>
				</OverflowMenu>
			{/if}
		</div>
	{/if}
</div>
