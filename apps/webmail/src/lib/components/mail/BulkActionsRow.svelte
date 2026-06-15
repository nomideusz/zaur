<script lang="ts">
	/**
	 * Bulk mark/spam/trash actions for the current selection — shared between
	 * the desktop inline action bar and the mobile island's bulk mode.
	 *
	 * The Highlight action is always inline; the remaining mark actions go
	 * inline as measured space allows, the rest into the More menu.
	 */
	import {
		bulkBarActions,
		fitBulkActions,
		type BulkBarAction,
		type BulkBarActionId
	} from '$lib/components/mail/bulk-bar-actions';
	import { bulkSelectionCounts } from '$lib/components/mail/bulk-selection-label';
	import Important from '$lib/components/icons/Important.svelte';
	import Mail from '$lib/components/icons/Mail.svelte';
	import MailOpen from '$lib/components/icons/MailOpen.svelte';
	import MoreVertical from '$lib/components/icons/MoreVertical.svelte';
	import ShieldAlert from '$lib/components/icons/ShieldAlert.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import { ActionBarSeparator } from '$lib/components/ui/action-bar';
	import Button from '$lib/components/ui/Button.svelte';
	import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '$lib/components/ui/menu';
	import { canMarkImportantFromMailboxRole } from '$lib/mail/mailboxes';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import type { Component } from 'svelte';

	interface Props {
		mailboxRouteId: string;
		onBulkAction?: () => void;
		/** Marks menu opens away from the bar — 'top' inside the island. */
		menuSide?: 'top' | 'bottom';
		/** Unique id for the marks menu — the row mounts twice (bar + island). */
		menuId?: string;
		/**
		 * Space the row may use, measured by the parent (the action bar itself is
		 * fit-content, so it can't self-measure). Unset = everything inline.
		 */
		availableWidth?: number;
	}

	let {
		mailboxRouteId,
		onBulkAction,
		menuSide = 'top',
		menuId = 'bulk-actions-menu',
		availableWidth = Number.POSITIVE_INFINITY
	}: Props = $props();

	const ACTION_ICONS: Partial<
		Record<BulkBarActionId, Component<{ class?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>>
	> = {
		unsee: Mail,
		'mark-seen': MailOpen,
		important: Important,
		'not-important': Important,
		spam: ShieldAlert
	};

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const selectedCount = $derived(selectedIds.length);
	const selectedMessages = $derived(mail.selectedMessages());
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Trash');
	const selectionCounts = $derived(bulkSelectionCounts(selectedMessages, selectedIds));
	const canMarkImportant = $derived(canMarkImportantFromMailboxRole(currentMailbox?.role));
	const junkMailbox = $derived(mail.mailboxes.find((mb) => mb.role === 'junk'));
	const canMarkSpam = $derived(
		!!junkMailbox &&
			currentMailbox?.role !== 'junk' &&
			currentMailbox?.role !== 'trash' &&
			currentMailbox?.role !== 'drafts' &&
			currentMailbox?.role !== 'sent'
	);
	const actions = $derived(
		bulkBarActions({
			counts: selectionCounts,
			selectedCount,
			canMarkImportant,
			canMarkSpam,
			deleteLabel
		})
	);

	const markActionIds = new Set<BulkBarActionId>([
		'unsee',
		'mark-seen',
		'important',
		'not-important',
		'spam'
	]);
	const markActions = $derived(actions.filter((action) => markActionIds.has(action.id)));

	const fitted = $derived(fitBulkActions(markActions, availableWidth));
	const inlineActions = $derived(fitted.inline);
	const overflowActions = $derived(fitted.overflow);
	/** Read-state group first, then spam — separated in the menu. */
	const overflowReadState = $derived(overflowActions.filter((action) => action.id !== 'spam'));
	const overflowSpam = $derived(overflowActions.filter((action) => action.id === 'spam'));

	const actionBtnSizeClass = 'min-h-8 min-w-8 gap-1.5 px-2 py-1.5 text-sm font-medium';
	const ghostBtnClass = `${actionBtnSizeClass} text-fg`;

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

	export function runAction(id: BulkBarActionId) {
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
			case 'spam': {
				const target = junkMailbox;
				if (!target) break;
				const count = selectedCount;
				void runBulk(async () => {
					await mail.bulkMoveToMailbox(auth.client!, target.id);
					toast.show(
						count === 1 ? 'Moved to Spam' : `${count} messages moved to Spam`,
						'success'
					);
				}, true);
				break;
			}
			case 'trash':
				void deleteSelected();
				break;
			case 'cancel':
				mail.clearSelection();
				break;
		}
	}
</script>

{#snippet actionIcon(action: BulkBarAction, sizeClass: string)}
	{@const Icon = ACTION_ICONS[action.id]}
	{#if Icon}
		<Icon class="{sizeClass} {action.id === 'not-important' ? 'opacity-50' : ''}" aria-hidden="true" />
	{/if}
{/snippet}

{#each inlineActions as action (action.id)}
	<Button variant="ghost" class="{ghostBtnClass} shrink-0" onclick={() => runAction(action.id)}>
		{@render actionIcon(action, 'size-4')}
		{action.label}
	</Button>
{/each}

{#if overflowActions.length > 0}
	<Menu side={menuSide} align="start" {menuId}>
		<MenuTrigger
			aria-label="More actions for selected messages"
			class={`z-btn-ghost ${ghostBtnClass} shrink-0`}
		>
			<MoreVertical class="size-4" aria-hidden="true" />
			<span class="max-sm:sr-only">More</span>
		</MenuTrigger>
		<MenuContent class="w-56 min-w-48">
			{#each overflowReadState as action (action.id)}
				<MenuItem label={action.label} onSelect={() => runAction(action.id)}>
					<span class="flex size-5 shrink-0 items-center justify-center">
						{@render actionIcon(action, 'size-4')}
					</span>
					<span class="truncate">{action.label}</span>
				</MenuItem>
			{/each}
			{#if overflowReadState.length > 0 && overflowSpam.length > 0}
				<MenuSeparator />
			{/if}
			{#each overflowSpam as action (action.id)}
				<MenuItem label={action.label} onSelect={() => runAction(action.id)}>
					<span class="flex size-5 shrink-0 items-center justify-center">
						{@render actionIcon(action, 'size-4')}
					</span>
					<span class="truncate">{action.label}</span>
				</MenuItem>
			{/each}
		</MenuContent>
	</Menu>
{/if}

<ActionBarSeparator />

<Button variant="danger" class="{actionBtnSizeClass} shrink-0" onclick={() => runAction('trash')}>
	<Trash2 class="size-4" aria-hidden="true" />
	<span class="max-sm:sr-only">{deleteLabel}</span>
</Button>
