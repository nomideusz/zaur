<script lang="ts">
	/**
	 * Bulk selection action bar — Shark UI @shark/action-bar `example-table` pattern:
	 * controlled open, inline toolbar below the message list, More menu, destructive delete, close.
	 */
	import {
		bulkBarActions,
		type BulkBarActionId
	} from '$lib/components/mail/bulk-bar-actions';
	import { bulkSelectionCounts } from '$lib/components/mail/bulk-selection-label';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import X from '$lib/components/icons/X.svelte';
	import {
		ActionBar,
		ActionBarBody,
		ActionBarClose,
		ActionBarContent,
		ActionBarSeparator,
		ActionBarValue
	} from '$lib/components/ui/action-bar';
	import Button from '$lib/components/ui/Button.svelte';
	import { Menu, MenuContent, MenuItem, MenuTrigger } from '$lib/components/ui/menu';
	import MoreVertical from '$lib/components/icons/MoreVertical.svelte';
	import { canMarkImportantFromMailboxRole } from '$lib/mail/mailboxes';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		mailboxRouteId: string;
		disabled?: boolean;
		onBulkAction?: () => void;
		children?: Snippet;
	}

	let { mailboxRouteId, disabled = false, onBulkAction, children }: Props = $props();

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
	const collapseMarks = $derived(markActions.length > 2);
	const isOpen = $derived(mail.hasSelection && selectedCount > 0);

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

	function handleOpenChange(open: boolean) {
		if (!open) mail.clearSelection();
	}

	function handleClose() {
		mail.clearSelection();
	}
</script>

<ActionBar
	open={isOpen}
	onOpenChange={handleOpenChange}
	closeOnEscape={!disabled}
	positioning={{ mode: 'inline' }}
>
	<div class="z-mail-list-action-bar-host flex min-h-0 flex-1 flex-col">
		{#if children}
			{@render children()}
		{/if}

		<ActionBarContent
			aria-label="Actions for selected messages"
			class={disabled ? 'pointer-events-none opacity-60' : undefined}
		>
			<ActionBarValue count={selectedCount} />

			<ActionBarSeparator />

			<ActionBarBody>
				{#if collapseMarks}
					<Menu>
						<MenuTrigger
							aria-label="More actions for selected messages"
							aria-controls="bulk-actions-menu"
							class={`z-btn-ghost ${ghostBtnClass}`}
						>
							<MoreVertical class="size-4" aria-hidden="true" />
							<span class="max-sm:sr-only">More</span>
						</MenuTrigger>
						<MenuContent id="bulk-actions-menu" side="top" align="start" class="w-56 min-w-48">
							{#each markActions as action (action.id)}
								<MenuItem label={action.label} onSelect={() => runAction(action.id)} />
							{/each}
						</MenuContent>
					</Menu>
				{:else}
					{#each markActions as action (action.id)}
						<Button variant="ghost" class={ghostBtnClass} onclick={() => runAction(action.id)}>
							{action.label}
						</Button>
					{/each}
				{/if}

				<ActionBarSeparator />

				<Button variant="danger" class={actionBtnSizeClass} onclick={() => runAction('trash')}>
					<Trash2 class="size-4" aria-hidden="true" />
					<span class="max-sm:sr-only">{deleteLabel}</span>
				</Button>
			</ActionBarBody>

			<ActionBarSeparator />

			<ActionBarClose
				class="{ghostBtnClass} opacity-64 transition-opacity hover:opacity-100 motion-reduce:transition-none"
				onclick={handleClose}
			>
				<X class="size-4" aria-hidden="true" />
			</ActionBarClose>
		</ActionBarContent>
	</div>
</ActionBar>
