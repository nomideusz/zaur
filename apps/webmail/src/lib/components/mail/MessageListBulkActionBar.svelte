<script lang="ts">
	/**
	 * Bulk selection action bar — Shark UI @shark/action-bar `example-table` pattern:
	 * controlled open, inline toolbar below the message list, More menu, destructive delete, close.
	 * The ActionBar root wraps the list so Escape clears selection.
	 *
	 * Two layouts share this component:
	 *  - `md+`: the original single-row pill (count | text actions | close).
	 *  - phones: a full-width dock — a header row (count, Select all, close) above a
	 *    horizontally scrolling row of icon actions. The pill's text buttons wrapped
	 *    onto three ragged lines at phone widths, which pushed the list off-screen.
	 */
	import BulkActionsRow from '$lib/components/mail/BulkActionsRow.svelte';
	import MessageListSelectMenu from '$lib/components/mail/MessageListSelectMenu.svelte';
	import {
		bulkSelectionCounts,
		bulkSelectionSummary
	} from '$lib/components/mail/bulk-selection-label';
	import X from '$lib/components/icons/X.svelte';
	import {
		ActionBar,
		ActionBarBody,
		ActionBarClose,
		ActionBarContent,
		ActionBarValue
	} from '$lib/components/ui/action-bar';
	import { mail } from '$lib/stores/mail.svelte';
	import { cn } from '$lib/utils/cn';
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
	/** Select mode keeps the dock open with nothing checked yet (phone "Select" entry). */
	const isOpen = $derived(mail.hasSelection || mail.selectMode);
	const summary = $derived(
		bulkSelectionSummary(selectedCount, bulkSelectionCounts(mail.selectedMessages(), selectedIds))
	);
	function handleOpenChange(open: boolean) {
		if (!open) mail.exitSelectMode();
	}

	function handleClose() {
		mail.exitSelectMode();
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
			class="z-action-bar-content--dock"
		>
			<!-- Tablet / desktop: one pill row. -->
			<div class="z-bulk-dock__inline max-md:hidden">
				<!-- Grouping is spacing, not pipes: count | actions | close read as
				     three zones because of the gaps and the accent count chip. -->
				<span class="flex shrink-0">
					<ActionBarValue
						count={selectedCount}
						label={summary.headline}
						class="z-action-bar-value--accent max-w-[12rem] truncate"
						title={summary.detail ?? summary.headline}
					/>
				</span>

				<!-- Every action link stays reachable regardless of pane width:
				     no width-fitting, the row wraps onto extra lines instead. -->
				<ActionBarBody class={cn('flex-wrap overflow-visible', disabled && 'pointer-events-none opacity-60')}>
					<BulkActionsRow {mailboxRouteId} {onBulkAction} menuSide="top" />
				</ActionBarBody>

				<ActionBarClose onclick={handleClose} aria-label="Clear selection">
					<X class="size-4" aria-hidden="true" />
				</ActionBarClose>
			</div>

			<!-- Phone: header row + scrolling icon row. -->
			<div class="z-bulk-dock__phone md:hidden">
				<div class="z-bulk-dock__header">
					<ActionBarValue count={selectedCount} class="z-action-bar-value--accent" />
					<p class="z-bulk-dock__status">
						{selectedCount > 0 ? summary.headline : 'Select messages'}
					</p>
					<MessageListSelectMenu
						placement="top"
						split
						{disabled}
						menuId="bulk-dock-select-menu"
					/>
					<!-- Close stays live even when the list is empty/loading, so the
					     dock is never a dead end. -->
					<ActionBarClose onclick={handleClose} aria-label="Clear selection">
						<X class="size-4" aria-hidden="true" />
					</ActionBarClose>
				</div>

				<div class={cn('z-bulk-dock__body', disabled && 'pointer-events-none opacity-60')}>
					<BulkActionsRow
						{mailboxRouteId}
						{onBulkAction}
						menuSide="top"
						menuId="bulk-actions-menu-mobile"
						variant="dock"
					/>
				</div>
			</div>
		</ActionBarContent>
	</div>
</ActionBar>
