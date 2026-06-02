<script lang="ts">
	import Important from '$lib/components/icons/Important.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import MessageListBulkMoreMenu from '$lib/components/mail/MessageListBulkMoreMenu.svelte';
	import {
		bulkSelectionCounts,
		bulkSelectionLabel,
		bulkSelectionPrimaryAction
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
	const currentMailbox = $derived(mailboxRouteId ? mail.mailboxByRouteId(mailboxRouteId) : null);
	const canArchive = $derived(mail.canArchiveFrom(currentMailbox));
	const canMarkImportant = $derived(mail.canMarkImportantInMailbox(currentMailbox));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Trash');
	const moveTargets = $derived(
		mailboxRouteId ? moveTargetMailboxes(mail.mailboxes, currentMailbox) : []
	);
	const selectionCounts = $derived(bulkSelectionCounts(mail.messages, selectedIds));
	const hasNotImportantSelected = $derived(selectionCounts.notImportant > 0);
	const hasImportantSelected = $derived(selectionCounts.important > 0);
	const selectionLabel = $derived(
		bulkSelectionLabel({
			selectedCount: selectedIds.length,
			notImportantCount: selectionCounts.notImportant,
			importantCount: selectionCounts.important,
			canMarkImportant
		})
	);
	const primaryAction = $derived(
		bulkSelectionPrimaryAction({
			notImportantCount: selectionCounts.notImportant,
			importantCount: selectionCounts.important,
			canMarkImportant
		})
	);
	const showMarkImportantButton = $derived(
		hasNotImportantSelected && canMarkImportant && primaryAction !== 'mark-important'
	);
	const showRemoveImportantButton = $derived(
		hasImportantSelected && primaryAction !== 'remove-important'
	);
	const hasMoreBulkActions = $derived(canArchive || moveTargets.length > 0);
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

	function archiveSelected() {
		if (!auth.client) return;
		void runBulk(() => mail.bulkArchive(auth.client!), true);
	}

	function handleBulkMove(targetRouteId: string) {
		if (!auth.client) return;
		void runBulk(() => mail.bulkMoveToMailbox(auth.client!, targetRouteId), true);
	}

	function runPrimaryAction() {
		if (!auth.client) return;
		if (primaryAction === 'mark-important') {
			void runBulk(() => mail.bulkMarkAsImportant(auth.client!));
			return;
		}
		if (primaryAction === 'remove-important') {
			void runBulk(() => mail.bulkMarkAsNotImportant(auth.client!));
		}
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
			{#if primaryAction}
				<button
					type="button"
					class="z-mail-list-header__count z-mail-list-bulk-bar__count z-mail-list-bulk-bar__count--action"
					onclick={runPrimaryAction}
				>
					{selectionLabel}
				</button>
			{:else}
				<span class="z-mail-list-header__count">{selectionLabel}</span>
			{/if}
			{#if showMarkImportantButton}
				<Button
					variant="ghost"
					class={actionButtonClass}
					onclick={() => auth.client && runBulk(() => mail.bulkMarkAsImportant(auth.client!))}
				>
					<Important class="size-3.5" aria-hidden="true" />
					Mark important
				</Button>
			{/if}
			{#if showRemoveImportantButton}
				<Button
					variant="ghost"
					class={actionButtonClass}
					onclick={() => auth.client && runBulk(() => mail.bulkMarkAsNotImportant(auth.client!))}
				>
					<Important class="size-3.5 opacity-50" aria-hidden="true" />
					Remove important
				</Button>
			{/if}
			<Button variant="danger" class={actionButtonClass} onclick={deleteSelected}>
				<Trash2 class="size-3.5" aria-hidden="true" />
				{deleteLabel}
			</Button>
			{#if hasMoreBulkActions && mailboxRouteId}
				<OverflowMenu
					label="More actions"
					menuId="bulk-more-menu-header"
					placement="auto"
					menuClass="z-overflow-menu--list"
					triggerText="More"
					triggerClass="!h-8 !px-2 !text-xs"
				>
					<MessageListBulkMoreMenu
						mailboxRouteId={mailboxRouteId}
						{canArchive}
						onArchive={archiveSelected}
						onMove={handleBulkMove}
					/>
				</OverflowMenu>
			{/if}
		</div>
	{/if}
</div>
