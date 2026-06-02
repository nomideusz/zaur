<script lang="ts">
	import MessageListBulkMoreMenu from '$lib/components/mail/MessageListBulkMoreMenu.svelte';
	import {
		bulkSelectionCounts,
		bulkSelectionReadCount,
		bulkSelectionSummary
	} from '$lib/components/mail/bulk-selection-label';
	import MessageListMasterCheckbox from '$lib/components/mail/MessageListMasterCheckbox.svelte';
	import MessageListSelectMenu from '$lib/components/mail/MessageListSelectMenu.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import { moveTargetMailboxes } from '$lib/mail/mailboxes';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		mailboxRouteId: string;
		showNavLinks?: boolean;
		disabled?: boolean;
		onBulkAction?: () => void;
	}

	let { mailboxRouteId, showNavLinks = false, disabled = false, onBulkAction }: Props = $props();

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const selectedCount = $derived(selectedIds.length);
	const selectedMessages = $derived(mail.selectedMessages());
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const canMarkImportant = $derived(mail.canMarkImportantInMailbox(currentMailbox));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Trash');
	const moveTargets = $derived(moveTargetMailboxes(mail.mailboxes, currentMailbox));
	const selectionCounts = $derived(bulkSelectionCounts(selectedMessages, selectedIds));
	const unresolvedCount = $derived(Math.max(0, selectedCount - selectedMessages.length));
	const readCount = $derived(bulkSelectionReadCount(selectionCounts));
	const selectionSummary = $derived(
		bulkSelectionSummary(selectedCount, selectionCounts, unresolvedCount)
	);
	const hasMenuActions = $derived(
		selectionCounts.new > 0 ||
			readCount > 0 ||
			(canMarkImportant &&
				(selectionCounts.notImportant > 0 || selectionCounts.important > 0)) ||
			moveTargets.length > 0
	);

	async function runBulk(action: () => Promise<void>, refreshList = false) {
		if (!auth.client || mail.bulkActionLoading) return;
		try {
			await action();
			if (refreshList) onBulkAction?.();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Action failed';
			toast.show(message, 'error');
		}
	}

	function deleteSelected() {
		if (!auth.client) return;
		const permanent = currentMailbox?.role === 'trash';
		if (!settings.confirmDeleteMessage(selectedCount, permanent)) return;
		void runBulk(() => mail.bulkDelete(auth.client!, mailboxRouteId), true);
	}

	function handleBulkMove(targetRouteId: string) {
		if (!auth.client) return;
		void runBulk(() => mail.bulkMoveToMailbox(auth.client!, targetRouteId), true);
	}

	function markSelectedDone() {
		if (!auth.client) return;
		void runBulk(() => mail.bulkMarkAsDone(auth.client!), true);
	}

	function markSelectedNew() {
		if (!auth.client) return;
		void runBulk(() => mail.bulkMarkAsNew(auth.client!), true);
	}

	function markSelectedImportant() {
		if (!auth.client) return;
		void runBulk(() => mail.bulkMarkAsImportant(auth.client!));
	}

	function removeSelectedImportant() {
		if (!auth.client) return;
		void runBulk(() => mail.bulkMarkAsNotImportant(auth.client!));
	}

	function clearSelection() {
		mail.clearSelection();
	}
</script>

<div class="z-mail-text-nav z-mail-text-nav--bulk">
	{#if showNavLinks}
		<div class="z-mail-text-nav__links">
			<button type="button" class="z-mail-text-nav__link" onclick={clearSelection}>
				Cancel
			</button>
		</div>
	{/if}
	<nav
		class={cn('z-mail-text-nav__row z-mail-list-bulk-bar', disabled && 'pointer-events-none opacity-60')}
		aria-label="Selected messages"
	>
		<div class="z-mail-list-bulk-bar__controls">
			<MessageListMasterCheckbox class="z-mail-list-bulk-bar__checkbox" />
			<MessageListSelectMenu {disabled} compact placement="bottom" />
			{#if !showNavLinks}
				<button type="button" class="z-mail-text-nav__link" onclick={clearSelection}>
					Cancel
				</button>
			{/if}
		</div>

		<p class="z-mail-list-bulk-bar__summary" aria-live="polite">
			<span class="z-mail-list-bulk-bar__headline">{selectionSummary.headline}</span>
			{#if selectionSummary.detail}
				<span class="z-mail-list-bulk-bar__detail"> · {selectionSummary.detail}</span>
			{/if}
		</p>

		<div class="z-mail-text-nav__links z-mail-list-bulk-bar__links">
			<button
				type="button"
				class="z-mail-text-nav__link z-mail-text-nav__link--danger"
				onclick={deleteSelected}
			>
				{deleteLabel}
			</button>
			{#if hasMenuActions}
				<OverflowMenu
					label="More actions"
					menuId="bulk-more-menu"
					placement="auto"
					menuClass="z-overflow-menu--list"
					triggerText="Actions"
					textTrigger
					triggerClass="z-mail-text-nav__link"
				>
					<MessageListBulkMoreMenu
						{mailboxRouteId}
						{selectedCount}
						counts={selectionCounts}
						{canMarkImportant}
						onDone={markSelectedDone}
						onMarkNew={markSelectedNew}
						onMarkImportant={markSelectedImportant}
						onRemoveImportant={removeSelectedImportant}
						onMove={handleBulkMove}
					/>
				</OverflowMenu>
			{/if}
		</div>
	</nav>
</div>
