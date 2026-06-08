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
		disabled?: boolean;
		onBulkAction?: () => void;
		/** Mobile app shell — text-nav links instead of checkbox/icon chrome. */
		surface?: 'pane' | 'shell';
		class?: string;
	}

	let {
		mailboxRouteId,
		disabled = false,
		onBulkAction,
		surface = 'pane',
		class: className = ''
	}: Props = $props();

	const bulkLinkBase =
		'cursor-pointer px-1 py-1.5 text-sm font-medium transition-colors hover:underline hover:underline-offset-4';
	const bulkBarActionClass = cn(bulkLinkBase, 'text-fg-muted hover:text-fg hover:decoration-fg/30');
	const bulkBarDangerClass = cn(bulkLinkBase, 'text-danger hover:decoration-danger/40');

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
	const summaryTitle = $derived(
		selectionSummary.detail ? `${headline} · ${selectionSummary.detail}` : headline
	);
	const hasMenuActions = $derived(
		selectionCounts.new > 0 ||
			readCount > 0 ||
			(canMarkImportant &&
				(selectionCounts.notImportant > 0 || selectionCounts.important > 0)) ||
			moveTargets.length > 0
	);
	const showSelectionBar = $derived(selectedCount > 0);

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

{#snippet bulkActionsMenu()}
	<MessageListBulkMoreMenu
		{mailboxRouteId}
		{selectedCount}
		counts={selectionCounts}
		{canMarkImportant}
		onDone={() => auth.client && runBulk(() => mail.bulkMarkAsDone(auth.client!), true)}
		onMarkSeen={() => auth.client && runBulk(() => mail.bulkMarkAsSeen(auth.client!), true)}
		onMarkNew={() => auth.client && runBulk(() => mail.bulkMarkAsNew(auth.client!), true)}
		onMarkImportant={() => auth.client && runBulk(() => mail.bulkMarkAsImportant(auth.client!))}
		onRemoveImportant={() =>
			auth.client && runBulk(() => mail.bulkMarkAsNotImportant(auth.client!))}
		onMove={handleBulkMove}
	/>
{/snippet}

{#if surface === 'shell'}
	<nav
		class={cn(
			'z-mail-list-bulk-bar z-mail-list-bulk-header--shell w-full min-w-0 items-center',
			disabled && 'pointer-events-none opacity-60',
			className
		)}
		aria-label="Selected messages"
	>
		<button type="button" class={cn(bulkBarActionClass, 'shrink-0')} onclick={clearSelection}>
			Cancel
		</button>

		{#if showSelectionBar}
			<p
				class="z-mail-list-bulk-header__summary z-mail-list-bulk-header__summary--shell"
				aria-live="polite"
				title={summaryTitle}
			>
				{headline}
			</p>

			<nav class="z-mail-list-bulk-bar__links shrink-0" aria-label="Bulk actions">
				<button type="button" class={bulkBarDangerClass} onclick={deleteSelected}>
					{deleteLabel}
				</button>
				{#if hasMenuActions}
					<OverflowMenu
						label="Bulk actions"
						menuId="bulk-actions-menu-mobile"
						placement="bottom"
						textTrigger
						triggerText="Actions"
						triggerClass={bulkBarActionClass}
					>
						{@render bulkActionsMenu()}
					</OverflowMenu>
				{/if}
			</nav>
		{/if}
	</nav>
{:else}
	<nav
		class={cn(
			'z-mail-list-bulk-bar w-full min-w-0 items-center',
			disabled && 'pointer-events-none opacity-60',
			className
		)}
		aria-label="Selected messages"
	>
		<div class="z-mail-list-bulk-bar__controls">
			<div class="z-mail-list-checkbox-col">
				<MessageListMasterCheckbox class="z-mail-list-bulk-bar__checkbox" />
			</div>
			<MessageListSelectMenu {disabled} placement="bottom" />
		</div>

		{#if showSelectionBar}
			<p class="z-mail-list-bulk-bar__summary" aria-live="polite" title={summaryTitle}>
				{headline}
			</p>

			<nav class="z-mail-list-bulk-bar__links" aria-label="Bulk actions">
				<button type="button" class={bulkBarDangerClass} onclick={deleteSelected}>
					{deleteLabel}
				</button>
				{#if hasMenuActions}
					<OverflowMenu
						label="Bulk actions"
						menuId="bulk-actions-menu"
						placement="bottom"
						textTrigger
						triggerText="Actions"
						triggerClass={bulkBarActionClass}
					>
						{@render bulkActionsMenu()}
					</OverflowMenu>
				{/if}
				<button type="button" class={bulkBarActionClass} onclick={clearSelection}>
					Cancel
				</button>
			</nav>
		{/if}
	</nav>
{/if}
