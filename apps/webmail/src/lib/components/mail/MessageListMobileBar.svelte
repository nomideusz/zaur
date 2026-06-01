<script lang="ts">
	import Archive from '$lib/components/icons/Archive.svelte';
	import Important from '$lib/components/icons/Important.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import X from '$lib/components/icons/X.svelte';
	import MessageListMasterCheckbox from '$lib/components/mail/MessageListMasterCheckbox.svelte';
	import MessageListSelectMenu from '$lib/components/mail/MessageListSelectMenu.svelte';
	import MoveToMenuItems from '$lib/components/mail/MoveToMenuItems.svelte';
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
	const hasNotImportantSelected = $derived(
		mail.messages.some((message) => selectedIds.includes(message.id) && !message.important)
	);
	const hasImportantSelected = $derived(
		mail.messages.some((message) => selectedIds.includes(message.id) && message.important)
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
		if (!settings.confirmDeleteMessage(selectedIds.length, permanent)) return;
		void runBulk(() => mail.bulkDelete(auth.client!, mailboxRouteId), true);
	}

	function handleBulkMove(targetRouteId: string) {
		if (!auth.client) return;
		void runBulk(() => mail.bulkMoveToMailbox(auth.client!, targetRouteId), true);
	}
</script>

<nav
	class={cn('z-mail-list-bulk-bar', disabled && 'pointer-events-none opacity-60')}
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

	<span class="z-mail-list-bulk-bar__count">{selectedIds.length} selected</span>

	<div class="z-mail-list-bulk-bar__actions">
		{#if hasNotImportantSelected && canMarkImportant}
			<Button
				variant="ghost"
				class="z-mail-list-bulk-bar__btn"
				onclick={() => auth.client && runBulk(() => mail.bulkMarkAsImportant(auth.client!))}
			>
				<Important class="size-4" aria-hidden="true" />
				<span class="max-sm:sr-only">Mark important</span>
			</Button>
		{/if}
		{#if hasImportantSelected}
			<Button
				variant="ghost"
				class="z-mail-list-bulk-bar__btn"
				onclick={() => auth.client && runBulk(() => mail.bulkMarkAsNotImportant(auth.client!))}
			>
				<Important class="size-4 opacity-50" aria-hidden="true" />
				<span class="max-sm:sr-only">Remove important</span>
			</Button>
		{/if}
		{#if canArchive}
			<Button
				variant="ghost"
				class="z-mail-list-bulk-bar__btn"
				onclick={() => auth.client && runBulk(() => mail.bulkArchive(auth.client!), true)}
			>
				<Archive class="size-4" aria-hidden="true" />
				<span class="max-sm:sr-only">Archive</span>
			</Button>
		{/if}
		{#if moveTargets.length}
			<OverflowMenu
				label="Move selected messages"
				menuId="bulk-move-menu"
				placement="auto"
				menuClass="z-overflow-menu--list"
			>
				<MoveToMenuItems currentMailboxRouteId={mailboxRouteId} onSelect={handleBulkMove} />
			</OverflowMenu>
		{/if}
		<Button variant="danger" class="z-mail-list-bulk-bar__btn" onclick={deleteSelected}>
			<Trash2 class="size-4" aria-hidden="true" />
			<span class="max-sm:sr-only">{deleteLabel}</span>
		</Button>
	</div>
</nav>
