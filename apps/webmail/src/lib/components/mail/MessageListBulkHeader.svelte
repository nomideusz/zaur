<script lang="ts">
	import {
		bulkBarActions,
		type BulkBarActionId
	} from '$lib/components/mail/bulk-bar-actions';
	import { bulkSelectionCounts } from '$lib/components/mail/bulk-selection-label';
	import MessageListMasterCheckbox from '$lib/components/mail/MessageListMasterCheckbox.svelte';
	import MessageListSelectMenu from '$lib/components/mail/MessageListSelectMenu.svelte';
	import { canMarkImportantFromMailboxRole } from '$lib/mail/mailboxes';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		mailboxRouteId: string;
		disabled?: boolean;
		onBulkAction?: () => void;
		/** Mobile app shell — same bar, tighter padding in CSS. */
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

	const linkClass = 'z-mail-text-nav__link';
	const dangerLinkClass = 'z-mail-text-nav__link z-mail-text-nav__link--danger';

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const selectedCount = $derived(selectedIds.length);
	const selectedMessages = $derived(mail.selectedMessages());
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Trash');
	const selectionCounts = $derived(bulkSelectionCounts(selectedMessages, selectedIds));
	const canMarkImportant = $derived(canMarkImportantFromMailboxRole(currentMailbox?.role));
	const actions = $derived(
		bulkBarActions({
			counts: selectionCounts,
			selectedCount,
			canMarkImportant,
			deleteLabel
		})
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

	async function deleteSelected() {
		if (!auth.client) return;
		const permanent = currentMailbox?.role === 'trash';
		if (!(await settings.confirmDeleteMessage(selectedCount, permanent))) return;
		void runBulk(() => mail.bulkDelete(auth.client!, mailboxRouteId), true);
	}

	function runAction(id: BulkBarActionId) {
		if (!auth.client) return;

		switch (id) {
			case 'unsee':
				void runBulk(() => mail.bulkMarkAsNew(auth.client!), true);
				break;
			case 'mark-seen':
				void runBulk(() => mail.bulkMarkAsSeen(auth.client!), true);
				break;
			case 'important':
				void runBulk(() => mail.bulkMarkAsImportant(auth.client!), true);
				break;
			case 'not-important':
				void runBulk(() => mail.bulkMarkAsNotImportant(auth.client!), true);
				break;
			case 'trash':
				void deleteSelected();
				break;
			case 'cancel':
				mail.clearSelection();
				break;
		}
	}
</script>

<nav
	class={cn(
		'z-mail-list-bulk-bar w-full min-w-0',
		surface === 'shell' && 'z-mail-list-bulk-header--shell',
		disabled && 'pointer-events-none opacity-60',
		className
	)}
	aria-label="Selected messages"
>
	<div class="z-mail-list-bulk-bar__selectors">
		<div class="z-mail-list-checkbox-col">
			<MessageListMasterCheckbox class="z-mail-list-bulk-bar__checkbox" />
		</div>
		<MessageListSelectMenu {disabled} />
	</div>

	<div class="z-mail-list-bulk-bar__links">
		{#each actions as action (action.id)}
			<button
				type="button"
				class={action.variant === 'danger' ? dangerLinkClass : linkClass}
				onclick={() => runAction(action.id)}
			>
				{action.label}
			</button>
		{/each}
	</div>
</nav>
