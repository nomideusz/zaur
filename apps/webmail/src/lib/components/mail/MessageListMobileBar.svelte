<script lang="ts">
	import Archive from '$lib/components/icons/Archive.svelte';
	import Mail from '$lib/components/icons/Mail.svelte';
	import MailOpen from '$lib/components/icons/MailOpen.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import X from '$lib/components/icons/X.svelte';
	import MoveToMenuItems from '$lib/components/mail/MoveToMenuItems.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		mailboxRouteId: string;
		onBulkAction?: () => void;
	}

	let { mailboxRouteId, onBulkAction }: Props = $props();

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const canArchive = $derived(mail.canArchiveFrom(currentMailbox));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete' : 'Trash');
	const moveTargets = $derived(
		mail.mailboxes.filter((mb) => mb.jmapId && mb.id !== currentMailbox?.id)
	);
	const hasUnreadSelected = $derived(
		mail.messages.some((message) => selectedIds.includes(message.id) && message.unread)
	);
	const hasReadSelected = $derived(
		mail.messages.some((message) => selectedIds.includes(message.id) && !message.unread)
	);

	async function runBulk(action: () => Promise<void>) {
		if (!auth.client || mail.bulkActionLoading) return;
		try {
			await action();
			onBulkAction?.();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Action failed';
			toast.show(message, 'error');
		}
	}

	function deleteSelected() {
		if (!auth.client) return;
		const permanent = currentMailbox?.role === 'trash';
		if (!settings.confirmDeleteMessage(selectedIds.length, permanent)) return;
		void runBulk(() => mail.bulkDelete(auth.client!, mailboxRouteId));
	}

	function handleBulkMove(targetRouteId: string) {
		if (!auth.client) return;
		void runBulk(() => mail.bulkMoveToMailbox(auth.client!, targetRouteId));
	}
</script>

<nav
	class="z-mail-list-mobile-bar md:hidden"
	aria-label="Selected messages"
>
	<IconButton
		label="Cancel selection"
		class="z-mail-list-mobile-bar__cancel"
		onclick={() => mail.clearSelection()}
	>
		<X class="size-5" aria-hidden="true" />
	</IconButton>

	<span class="z-mail-list-mobile-bar__count">{selectedIds.length} selected</span>

	<div class="z-mail-list-mobile-bar__actions">
		{#if hasUnreadSelected}
			<Button
				variant="ghost"
				class={cn('z-mail-list-mobile-bar__btn')}
				onclick={() => auth.client && runBulk(() => mail.bulkMarkAsRead(auth.client!))}
			>
				<MailOpen class="size-4" aria-hidden="true" />
				Read
			</Button>
		{/if}
		{#if hasReadSelected}
			<Button
				variant="ghost"
				class={cn('z-mail-list-mobile-bar__btn')}
				onclick={() => auth.client && runBulk(() => mail.bulkMarkAsUnread(auth.client!))}
			>
				<Mail class="size-4" aria-hidden="true" />
				Unread
			</Button>
		{/if}
		{#if canArchive}
			<Button
				variant="ghost"
				class={cn('z-mail-list-mobile-bar__btn')}
				onclick={() => auth.client && runBulk(() => mail.bulkArchive(auth.client!))}
			>
				<Archive class="size-4" aria-hidden="true" />
				Archive
			</Button>
		{/if}
		{#if moveTargets.length}
			<OverflowMenu
				label="Move selected messages"
				menuId="bulk-move-mobile-menu"
				placement="top"
				menuClass="z-overflow-menu--list"
			>
				<MoveToMenuItems currentMailboxRouteId={mailboxRouteId} onSelect={handleBulkMove} />
			</OverflowMenu>
		{/if}
		<Button variant="danger" class={cn('z-mail-list-mobile-bar__btn')} onclick={deleteSelected}>
			<Trash2 class="size-4" aria-hidden="true" />
			{deleteLabel}
		</Button>
	</div>
</nav>
