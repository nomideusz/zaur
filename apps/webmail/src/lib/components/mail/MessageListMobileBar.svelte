<script lang="ts">
	import Important from '$lib/components/icons/Important.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import X from '$lib/components/icons/X.svelte';
	import MessageListBulkMoreMenu from '$lib/components/mail/MessageListBulkMoreMenu.svelte';
	import {
		bulkSelectionCounts,
		bulkSelectionLabel,
		bulkSelectionPrimaryAction
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
	}

	let { mailboxRouteId, disabled = false, onBulkAction }: Props = $props();

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const canArchive = $derived(mail.canArchiveFrom(currentMailbox));
	const canMarkImportant = $derived(mail.canMarkImportantInMailbox(currentMailbox));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Trash');
	const moveTargets = $derived(moveTargetMailboxes(mail.mailboxes, currentMailbox));
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

<nav
	class={cn('z-mail-list-bulk-bar z-mail-list-bulk-bar--inline', disabled && 'pointer-events-none opacity-60')}
	aria-label="Selected messages"
>
	<MessageListMasterCheckbox class="z-mail-list-bulk-bar__checkbox" />
	<div class="z-mail-list-bulk-bar__select">
		<MessageListSelectMenu {disabled} placement="top" />
		<IconButton
			label="Cancel selection"
			class="z-mail-list-bulk-bar__cancel"
			onclick={() => mail.clearSelection()}
		>
			<X class="size-5" aria-hidden="true" />
		</IconButton>
	</div>

	{#if primaryAction}
		<button
			type="button"
			class="z-mail-list-bulk-bar__count z-mail-list-bulk-bar__count--action"
			onclick={runPrimaryAction}
		>
			{selectionLabel}
		</button>
	{:else}
		<span class="z-mail-list-bulk-bar__count">{selectionLabel}</span>
	{/if}

	<div class="z-mail-list-bulk-bar__actions">
		{#if showMarkImportantButton}
			<Button
				variant="ghost"
				class="z-mail-list-bulk-bar__btn"
				onclick={() => auth.client && runBulk(() => mail.bulkMarkAsImportant(auth.client!))}
			>
				<Important class="size-4" aria-hidden="true" />
				<span class="max-sm:sr-only">Mark important</span>
			</Button>
		{/if}
		{#if showRemoveImportantButton}
			<Button
				variant="ghost"
				class="z-mail-list-bulk-bar__btn"
				onclick={() => auth.client && runBulk(() => mail.bulkMarkAsNotImportant(auth.client!))}
			>
				<Important class="size-4 opacity-50" aria-hidden="true" />
				<span class="max-sm:sr-only">Remove important</span>
			</Button>
		{/if}
		<Button variant="danger" class="z-mail-list-bulk-bar__btn" onclick={deleteSelected}>
			<Trash2 class="size-4" aria-hidden="true" />
			<span class="max-sm:sr-only">{deleteLabel}</span>
		</Button>
		{#if hasMoreBulkActions}
			<OverflowMenu
				label="More actions"
				menuId="bulk-more-menu"
				placement="auto"
				menuClass="z-overflow-menu--list"
			>
				<MessageListBulkMoreMenu
					{mailboxRouteId}
					{canArchive}
					onArchive={archiveSelected}
					onMove={handleBulkMove}
				/>
			</OverflowMenu>
		{/if}
	</div>
</nav>
