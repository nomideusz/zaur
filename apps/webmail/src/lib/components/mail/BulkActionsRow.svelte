<script lang="ts">
	/**
	 * Bulk mark/spam/archive/trash actions for the current selection — shared between
	 * the desktop inline action bar and the mobile island's bulk mode.
	 *
	 * Highlight, Archive, and folder restore (Not spam / Move to inbox) stay inline
	 * preferentially; remaining marks fit by width; Move targets live in the More menu.
	 */
	import { errorMessage } from '@zaur/mail-core/utils/errors';
	import {
		bulkBarActions,
		fitBulkActions,
		type BulkBarAction,
		type BulkBarActionId
	} from '$lib/components/mail/bulk-bar-actions';
	import { bulkSelectionCounts } from '$lib/components/mail/bulk-selection-label';
	import MoveToMenuItems from '$lib/components/mail/MoveToMenuItems.svelte';
	import Archive from '$lib/components/icons/Archive.svelte';
	import Eye from '$lib/components/icons/Eye.svelte';
	import EyeOff from '$lib/components/icons/EyeOff.svelte';
	import Important from '$lib/components/icons/Important.svelte';
	import Inbox from '$lib/components/icons/Inbox.svelte';
	import MoreVertical from '$lib/components/icons/MoreVertical.svelte';
	import Shield from '$lib/components/icons/Shield.svelte';
	import ShieldAlert from '$lib/components/icons/ShieldAlert.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '$lib/components/ui/menu';
	import { canMarkImportantFromMailboxRole, moveTargetMailboxes } from '$lib/mail/mailboxes';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';
	import { onMount } from 'svelte';
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
		/** Island mode — icon-only tap targets, labels via aria-label. */
		iconOnly?: boolean;
	}

	let {
		mailboxRouteId,
		onBulkAction,
		menuSide = 'top',
		menuId = 'bulk-actions-menu',
		availableWidth = Number.POSITIVE_INFINITY,
		iconOnly = false
	}: Props = $props();

	const ACTION_ICONS: Partial<
		Record<BulkBarActionId, Component<{ class?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>>
	> = {
		unsee: EyeOff,
		'mark-seen': Eye,
		important: Important,
		'not-important': Important,
		spam: ShieldAlert,
		restore: Inbox,
		archive: Archive
	};

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const selectedCount = $derived(selectedIds.length);
	const selectedMessages = $derived(mail.selectedMessages());
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Trash');
	const selectionCounts = $derived(bulkSelectionCounts(selectedMessages, selectedIds));
	const canMarkImportant = $derived(canMarkImportantFromMailboxRole(currentMailbox?.role));
	const junkMailbox = $derived(mail.mailboxes.find((mb) => mb.role === 'junk'));
	const archiveMailbox = $derived(mail.mailboxes.find((mb) => mb.role === 'archive'));
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
	const canArchive = $derived(
		!!archiveMailbox &&
			mailboxRole !== 'archive' &&
			mailboxRole !== 'trash' &&
			mailboxRole !== 'drafts' &&
			mailboxRole !== 'junk'
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
			canArchive,
			deleteLabel
		})
	);

	const markActionIds = new Set<BulkBarActionId>([
		'unsee',
		'mark-seen',
		'important',
		'not-important',
		'spam',
		'restore',
		'archive'
	]);
	/**
	 * Island prefers Seen inline (everyday triage); Archive is a deliberate
	 * secondary action there — always in More, never an inline icon — so a
	 * stray tap can't archive a selection. Desktop keeps Highlight first.
	 */
	const islandSecondary = $derived(iconOnly ? actions.filter((a) => a.id === 'archive') : []);
	const markActions = $derived(
		actions
			.filter((action) => markActionIds.has(action.id))
			.filter((action) => !(iconOnly && action.id === 'archive'))
			.map((action) => {
				if (!iconOnly) return action;
				if (action.id === 'mark-seen' || action.id === 'unsee') {
					return { ...action, priority: 1 };
				}
				if (action.id === 'important' || action.id === 'not-important') {
					return { ...action, priority: 2 };
				}
				return action;
			})
	);

	/* Icon buttons are fixed-width (2.75rem + gap); reserve trash + More. */
	const fitted = $derived(
		fitBulkActions(
			markActions,
			availableWidth,
			iconOnly
				? { reservedWidth: 104, actionWidth: 50, moreAlwaysShown: canMove }
				: { moreAlwaysShown: canMove }
		)
	);
	const inlineActions = $derived(fitted.inline);
	const overflowActions = $derived(fitted.overflow);
	/** Read-state / archive group first, then spam — separated in the menu. */
	const overflowPrimary = $derived([
		...islandSecondary,
		...overflowActions.filter((action) => action.id !== 'spam')
	]);
	const overflowSpam = $derived(overflowActions.filter((action) => action.id === 'spam'));
	const showMoreMenu = $derived(
		overflowActions.length > 0 || islandSecondary.length > 0 || canMove
	);
	/** Keyboard `v` opens the More menu (Move targets live there). */
	let moreOpen = $state(false);

	onMount(() => {
		const openMove = () => {
			if (!canMove && overflowActions.length === 0) return;
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
			case 'archive': {
				const target = archiveMailbox;
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

{#snippet actionIcon(action: BulkBarAction, sizeClass: string)}
	{@const Icon = action.id === 'restore' && action.label === 'Not spam' ? Shield : ACTION_ICONS[action.id]}
	{#if Icon}
		<Icon class="{sizeClass} {action.id === 'not-important' ? 'opacity-50' : ''}" aria-hidden="true" />
	{/if}
{/snippet}

{#each inlineActions as action (action.id)}
	{#if iconOnly}
		<button
			type="button"
			class="z-mobile-island__icon-btn shrink-0"
			aria-label={action.label}
			title={action.label}
			onclick={() => runAction(action.id)}
		>
			{@render actionIcon(action, 'size-[1.125rem]')}
		</button>
	{:else}
		<button type="button" class={linkBtnClass} onclick={() => runAction(action.id)}>
			{action.label}
		</button>
	{/if}
{/each}

{#if showMoreMenu}
	<Menu
		side={menuSide}
		align="start"
		{menuId}
		bind:open={moreOpen}
		onOpenChange={(open) => (moreOpen = open)}
	>
		<MenuTrigger
			aria-label="More actions for selected messages"
			class={iconOnly
				? 'z-mobile-island__icon-btn shrink-0'
				: cn(linkBtnClass, 'inline-flex items-center gap-1')}
		>
			{#if iconOnly}
				<MoreVertical class="size-[1.125rem]" aria-hidden="true" />
			{:else}
				More
			{/if}
		</MenuTrigger>
		<MenuContent class="w-56 min-w-48">
			{#each overflowPrimary as action (action.id)}
				<MenuItem label={action.label} onSelect={() => runAction(action.id)}>
					<span class="flex size-5 shrink-0 items-center justify-center">
						{@render actionIcon(action, 'size-4')}
					</span>
					<span class="truncate">{action.label}</span>
				</MenuItem>
			{/each}
			{#if overflowPrimary.length > 0 && overflowSpam.length > 0}
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
			{#if canMove}
				{#if overflowActions.length > 0}
					<MenuSeparator />
				{/if}
				<MoveToMenuItems currentMailboxRouteId={mailboxRouteId} onSelect={moveSelected} />
			{/if}
		</MenuContent>
	</Menu>
{/if}

{#if iconOnly}
	<button
		type="button"
		class="z-mobile-island__icon-btn z-mobile-island__icon-btn--danger shrink-0"
		aria-label={deleteLabel}
		title={deleteLabel}
		onclick={() => runAction('trash')}
	>
		<Trash2 class="size-[1.125rem]" aria-hidden="true" />
	</button>
{:else}
	<button type="button" class={dangerActionClass} onclick={() => runAction('trash')}>
		{deleteLabel}
	</button>
{/if}
