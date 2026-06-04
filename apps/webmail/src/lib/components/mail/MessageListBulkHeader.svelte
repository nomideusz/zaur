<script lang="ts">
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import X from '$lib/components/icons/X.svelte';
	import MessageListBulkMoreMenu from '$lib/components/mail/MessageListBulkMoreMenu.svelte';
	import {
		bulkSelectionCounts,
		bulkSelectionReadCount,
		bulkSelectionSummary
	} from '$lib/components/mail/bulk-selection-label';
	import MessageListMasterCheckbox from '$lib/components/mail/MessageListMasterCheckbox.svelte';
	import MessageListSelectMenu from '$lib/components/mail/MessageListSelectMenu.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import { moveTargetMailboxes } from '$lib/mail/mailboxes';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		mailboxRouteId: string;
		disabled?: boolean;
		onBulkAction?: () => void;
		/** Mobile app shell — text-nav links instead of checkbox/icon chrome. */
		surface?: 'pane' | 'shell';
	}

	let { mailboxRouteId, disabled = false, onBulkAction, surface = 'pane' }: Props = $props();

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const selectedCount = $derived(selectedIds.length);
	const selectedMessages = $derived(mail.selectedMessages());
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const canMarkImportant = $derived(mail.canMarkImportantInMailbox(currentMailbox));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Trash');
	const moveTargets = $derived(moveTargetMailboxes(mail.mailboxes, currentMailbox));
	const selectionCounts = $derived(bulkSelectionCounts(selectedMessages, selectedIds));
	const readCount = $derived(bulkSelectionReadCount(selectionCounts));
	const unresolvedCount = $derived(Math.max(0, selectedCount - selectedMessages.length));
	const selectionSummary = $derived(
		bulkSelectionSummary(selectedCount, selectionCounts, unresolvedCount)
	);
	const headline = $derived(
		selectedCount === 0
			? 'None selected'
			: selectedCount === 1
				? '1 selected'
				: `${selectedCount} selected`
	);
	const detail = $derived(
		selectedCount > 0 && selectionSummary.detail ? selectionSummary.detail : null
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
			const message = err instanceof Error ? err.message : 'Bulk action failed';
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

	function clearSelection() {
		mail.clearSelection();
	}
</script>

{#if surface === 'shell'}
	<div
		class={cn(
			'z-mail-list-bulk-header z-mail-list-bulk-header--shell z-mail-text-nav__row w-full min-w-0',
			disabled && 'pointer-events-none opacity-60'
		)}
		role="group"
		aria-label="Selected messages"
	>
		<button type="button" class="z-mail-text-nav__link shrink-0" onclick={clearSelection}>
			Cancel
		</button>

		{#if selectedCount > 0}
			<p class="z-mail-list-bulk-header__summary z-mail-list-bulk-header__summary--shell" aria-live="polite">
				<span class="z-mail-list-bulk-header__headline">{headline}</span>
				{#if detail}
					<span class="z-mail-list-bulk-header__detail"> · {detail}</span>
				{/if}
			</p>

			<nav class="z-mail-text-nav__links z-mail-list-bulk-header__shell-links shrink-0" aria-label="Bulk actions">
				<button
					type="button"
					class="z-mail-text-nav__link z-mail-text-nav__link--danger"
					onclick={deleteSelected}
				>
					{deleteLabel}
				</button>
				<OverflowMenu
					label="Bulk actions"
					menuId="bulk-actions-menu-mobile"
					placement="bottom"
					textTrigger
					triggerText="Actions"
					triggerClass="z-mail-text-nav__link"
				>
					<div class="z-overflow-menu-scroll">
						<button
							type="button"
							class="z-overflow-menu-item"
							role="menuitem"
							onclick={() => mail.selectMessagesByFilter('all')}
						>
							Select all
						</button>
						<button
							type="button"
							class="z-overflow-menu-item"
							role="menuitem"
							onclick={() => mail.selectMessagesByFilter('none')}
						>
							Deselect all
						</button>
						{#if hasMenuActions}
							<div class="mx-4 my-1 border-t border-border" role="separator"></div>
							<MessageListBulkMoreMenu
								{mailboxRouteId}
								{selectedCount}
								counts={selectionCounts}
								{canMarkImportant}
								onDone={() => auth.client && runBulk(() => mail.bulkMarkAsDone(auth.client!), true)}
								onMarkNew={() => auth.client && runBulk(() => mail.bulkMarkAsNew(auth.client!), true)}
								onMarkImportant={() =>
									auth.client && runBulk(() => mail.bulkMarkAsImportant(auth.client!))}
								onRemoveImportant={() =>
									auth.client && runBulk(() => mail.bulkMarkAsNotImportant(auth.client!))}
								onMove={handleBulkMove}
							/>
						{/if}
					</div>
				</OverflowMenu>
			</nav>
		{/if}
	</div>
{:else}
	<div
		class={cn(
			'z-mail-list-bulk-header w-full min-w-0',
			disabled && 'pointer-events-none opacity-60'
		)}
		role="group"
		aria-label="Selected messages"
	>
		<div class="z-mail-list-bulk-header__lead">
			<MessageListMasterCheckbox class="z-mail-list-bulk-header__checkbox" />
			<MessageListSelectMenu {disabled} placement="bottom" />
			{#if selectedCount > 0}
				<p class="z-mail-list-bulk-header__summary" aria-live="polite">
					<span class="z-mail-list-bulk-header__headline">{headline}</span>
					{#if detail}
						<span class="z-mail-list-bulk-header__detail"> · {detail}</span>
					{/if}
				</p>
			{/if}
		</div>

		{#if selectedCount > 0}
			<div class="z-mail-list-bulk-header__actions">
				<Button variant="ghost" class="z-mail-list-bulk-header__danger hidden sm:inline-flex" onclick={deleteSelected}>
					<Trash2 class="size-4" aria-hidden="true" />
					{deleteLabel}
				</Button>
				<IconButton
					label={deleteLabel}
					class="z-mail-list-bulk-header__danger sm:hidden"
					onclick={deleteSelected}
				>
					<Trash2 class="size-5" aria-hidden="true" />
				</IconButton>
				{#if hasMenuActions}
					<OverflowMenu label="Bulk actions" menuId="bulk-actions-menu" placement="bottom">
						<MessageListBulkMoreMenu
							{mailboxRouteId}
							{selectedCount}
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
				<IconButton
					label="Clear selection"
					class="!min-h-8 !min-w-8 !p-1.5"
					onclick={clearSelection}
				>
					<X class="size-4" aria-hidden="true" />
				</IconButton>
			</div>
		{/if}
	</div>
{/if}
