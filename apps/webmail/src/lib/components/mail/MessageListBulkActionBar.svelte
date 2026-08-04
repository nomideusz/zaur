<script lang="ts">
	/**
	 * Bulk selection action bar — Shark UI @shark/action-bar `example-table` pattern:
	 * controlled open, inline toolbar below the message list, More menu, destructive delete, close.
	 * Desktop only — on phones the mobile island renders the same BulkActionsRow.
	 * The ActionBar root still wraps the list on all sizes so Escape clears selection.
	 */
	import BulkActionsRow from '$lib/components/mail/BulkActionsRow.svelte';
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
	const isOpen = $derived(mail.hasSelection && selectedCount > 0);
	const summary = $derived(
		bulkSelectionSummary(selectedCount, bulkSelectionCounts(mail.selectedMessages(), selectedIds))
	);

	/* The bar is fit-content, so space is measured on the host pane. The count
	   chip is measured rather than guessed — its label runs from "2 selected"
	   to "3 unseen, 2 normal" — and the rest of the chrome is fixed: the
	   positioner's 2rem gutter, the capsule's 0.75rem padding plus border, the
	   gaps between the three zones, and the 2.25rem close button. */
	let hostWidth = $state(0);
	let valueWidth = $state(0);
	const FIXED_CHROME_PX = 94;
	const actionsAvailableWidth = $derived(
		Math.max(0, hostWidth - valueWidth - FIXED_CHROME_PX)
	);

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
	<div class="z-mail-list-action-bar-host flex min-h-0 flex-1 flex-col" bind:clientWidth={hostWidth}>
		{#if children}
			{@render children()}
		{/if}

		<ActionBarContent
			aria-label="Actions for selected messages"
			class={cn('max-md:hidden', disabled && 'pointer-events-none opacity-60')}
		>
			<!-- Grouping is spacing, not pipes: count | actions | close read as
			     three zones because of the gaps and the accent count chip. -->
			<span class="flex shrink-0" bind:clientWidth={valueWidth}>
				<ActionBarValue
					count={selectedCount}
					label={summary.headline}
					class="z-action-bar-value--accent max-w-[12rem] truncate"
					title={summary.detail ?? summary.headline}
				/>
			</span>

			<ActionBarBody>
				<BulkActionsRow
					{mailboxRouteId}
					{onBulkAction}
					menuSide="top"
					availableWidth={actionsAvailableWidth}
				/>
			</ActionBarBody>

			<ActionBarClose onclick={handleClose} aria-label="Clear selection">
				<X class="size-4" aria-hidden="true" />
			</ActionBarClose>
		</ActionBarContent>
	</div>
</ActionBar>
