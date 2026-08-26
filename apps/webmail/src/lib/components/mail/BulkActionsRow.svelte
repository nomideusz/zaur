<script lang="ts">
	/**
	 * Bulk mark/spam/archive/trash actions for the current selection, rendered
	 * as labeled buttons inside the list's action bar (all viewports).
	 *
	 * Move targets live in the More menu.
	 */
	import { errorMessage } from '@zaur/mail-core/utils/errors';
	import {
		bulkBarActions,
		type BulkBarActionId
	} from '$lib/components/mail/bulk-bar-actions';
	import { bulkSelectionCounts } from '$lib/components/mail/bulk-selection-label';
	import MoveToMenuItems from '$lib/components/mail/MoveToMenuItems.svelte';
	import { Menu, MenuContent, MenuTrigger } from '$lib/components/ui/menu';
	import { canMarkImportantFromMailboxRole, moveTargetMailboxes } from '$lib/mail/mailboxes';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';
	import { onMount } from 'svelte';

	interface Props {
		mailboxRouteId: string;
		onBulkAction?: () => void;
		/** Marks menu opens away from the bar. */
		menuSide?: 'top' | 'bottom';
		/** Unique id for the marks menu. */
		menuId?: string;
	}

	let { mailboxRouteId, onBulkAction, menuSide = 'top', menuId = 'bulk-actions-menu' }: Props =
		$props();

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const selectedCount = $derived(selectedIds.length);
	const selectedMessages = $derived(mail.selectedMessages());
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Trash');
	const selectionCounts = $derived(bulkSelectionCounts(selectedMessages, selectedIds));
	const canMarkImportant = $derived(canMarkImportantFromMailboxRole(currentMailbox?.role));
	const junkMailbox = $derived(mail.mailboxes.find((mb) => mb.role === 'junk'));
	const inboxMailbox = $derived(mail.mailboxes.find((mb) => mb.role === 'inbox' && mb.jmapId));
	const mailboxRole = $derived(currentMailbox?.role);
	const canRestore = $derived(
		!!inboxMailbox &&
			(mailboxRole === 'junk' || mailboxRole === 'trash' || mailboxRole === 'archive')
	);
	const restoreLabel = $derived(mailboxRole === 'junk' ? 'Not spam' : 'Move to inbox');
	const canMarkSpam = $derived(
		!!junkMailbox &&
			mailboxRole !== 'junk' &&
			mailboxRole !== 'trash' &&
			mailboxRole !== 'drafts' &&
			mailboxRole !== 'sent'
	);
	const moveTargets = $derived(moveTargetMailboxes(mail.mailboxes, currentMailbox));
	const canMove = $derived(moveTargets.length > 0);
	const actions = $derived(
		bulkBarActions({
			counts: selectionCounts,
			selectedCount,
			canMarkImportant,
			canMarkSpam,
			canRestore,
			restoreLabel,
			deleteLabel
		})
	);

	const markActionIds = new Set<BulkBarActionId>([
		'unsee',
		'mark-seen',
		'important',
		'not-important',
		'spam',
		'restore'
	]);
	const markActions = $derived(actions.filter((action) => markActionIds.has(action.id)));

	/** Keyboard `v` opens the More menu (Move targets live there). */
	let moreOpen = $state(false);

	onMount(() => {
		const openMove = () => {
			if (!canMove) return;
			moreOpen = true;
		};
		window.addEventListener('zaur:open-bulk-move', openMove);
		return () => window.removeEventListener('zaur:open-bulk-move', openMove);
	});

	const linkBtnClass = 'z-action-bar-btn shrink-0';
	const dangerActionClass = 'z-action-bar-btn z-action-bar-btn--danger shrink-0';

	async function runBulk(action: () => Promise<void>, refreshList = false) {
		if (!auth.client) return;
		try {
			await action();
			if (refreshList) onBulkAction?.();
		} catch (err) {
			const message = errorMessage(err, 'Bulk action failed');
			toast.show(message, 'error');
		}
	}

	async function deleteSelected() {
		if (!auth.client) return;
		const permanent = currentMailbox?.role === 'trash';
		if (!(await settings.confirmDeleteMessage(selectedCount, permanent))) return;
		void runBulk(() => mail.bulkDelete(auth.client!, mailboxRouteId), true);
	}

	function moveSelected(targetRouteId: string) {
		void runBulk(() => mail.bulkMoveToMailbox(auth.client!, targetRouteId), true);
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
				void runBulk(() => mail.bulkMoveToMailbox(auth.client!, target.id), true);
				break;
			}
			case 'restore': {
				const target = inboxMailbox;
				if (!target) break;
				void runBulk(() => mail.bulkMoveToMailbox(auth.client!, target.id), true);
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

{#each markActions as action (action.id)}
	<button type="button" class={linkBtnClass} onclick={() => runAction(action.id)}>
		{action.label}
	</button>
{/each}

{#if canMove}
	<Menu
		side={menuSide}
		align="start"
		{menuId}
		bind:open={moreOpen}
		onOpenChange={(open) => (moreOpen = open)}
	>
		<MenuTrigger
			aria-label="More actions for selected messages"
			class={cn(linkBtnClass, 'inline-flex items-center gap-1')}
		>
			More
		</MenuTrigger>
		<MenuContent class="w-56 min-w-48">
			<MoveToMenuItems currentMailboxRouteId={mailboxRouteId} onSelect={moveSelected} />
		</MenuContent>
	</Menu>
{/if}

<button type="button" class={dangerActionClass} onclick={() => runAction('trash')}>
	{deleteLabel}
</button>
