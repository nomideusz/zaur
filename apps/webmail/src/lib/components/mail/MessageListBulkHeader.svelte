<script lang="ts">
	import {
		bulkBarActions,
		type BulkBarActionId
	} from '$lib/components/mail/bulk-bar-actions';
	import { bulkSelectionCounts } from '$lib/components/mail/bulk-selection-label';
	import MessageListMasterCheckbox from '$lib/components/mail/MessageListMasterCheckbox.svelte';
	import MessageListSelectMenu from '$lib/components/mail/MessageListSelectMenu.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
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

	/** Contextual mark/flag actions — shown inline when few, collapsed into a menu when many. */
	const markActionIds = new Set<BulkBarActionId>([
		'unsee',
		'mark-seen',
		'important',
		'not-important'
	]);
	const markActions = $derived(actions.filter((action) => markActionIds.has(action.id)));
	const trashAction = $derived(actions.find((action) => action.id === 'trash'));
	/**
	 * Keep the bar on a single line. The mobile shell is far narrower than the desktop
	 * pane, so it folds marks into the menu sooner (>1) to leave room for the count + Trash.
	 */
	const collapseMarks = $derived(markActions.length > (surface === 'shell' ? 1 : 2));
	const summaryLabel = $derived(`${selectedCount} selected`);

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

	<p class="z-mail-list-bulk-bar__summary" aria-live="polite">{summaryLabel}</p>

	<div class="z-mail-list-bulk-bar__links">
		{#if collapseMarks}
			<OverflowMenu
				label="Mark selected messages"
				menuId="bulk-mark-menu"
				placement="bottom"
				align="end"
				textTrigger
				triggerText="More"
				triggerClass={linkClass}
				menuClass="w-56 min-w-48"
			>
				{#each markActions as action (action.id)}
					<OverflowMenuItem label={action.label} onclick={() => runAction(action.id)} />
				{/each}
			</OverflowMenu>
		{:else}
			{#each markActions as action (action.id)}
				<button type="button" class={linkClass} onclick={() => runAction(action.id)}>
					{action.label}
				</button>
			{/each}
		{/if}

		<button type="button" class={linkClass} onclick={() => runAction('cancel')}>Cancel</button>
	</div>

	{#if trashAction}
		<div class="z-header-action-zone">
			<button
				type="button"
				class="z-mail-text-nav__action z-mail-text-nav__action--danger"
				onclick={() => runAction('trash')}
			>
				{trashAction.label}
			</button>
		</div>
	{/if}
</nav>
