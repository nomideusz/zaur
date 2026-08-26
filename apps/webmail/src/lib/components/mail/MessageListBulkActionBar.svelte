<script lang="ts">
	/**
	 * Bulk selection action bar — Shark UI @shark/action-bar `example-table` pattern:
	 * controlled open, inline toolbar below the message list, More menu, destructive delete, close.
	 * All viewports — on phones the row wraps onto extra lines.
	 * The ActionBar root wraps the list so Escape clears selection.
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
	const isOpen = $derived(mail.hasSelection && selectedCount > 0);
	const summary = $derived(
		bulkSelectionSummary(selectedCount, bulkSelectionCounts(mail.selectedMessages(), selectedIds))
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
	<div class="z-mail-list-action-bar-host flex min-h-0 flex-1 flex-col">
		{#if children}
			{@render children()}
		{/if}

		<ActionBarContent
			aria-label="Actions for selected messages"
			class={cn(disabled && 'pointer-events-none opacity-60')}
		>
			<!-- Grouping is spacing, not pipes: count | actions | close read as
			     three zones because of the gaps and the accent count chip. -->
			<span class="flex shrink-0 max-md:hidden">
				<ActionBarValue
					count={selectedCount}
					label={summary.headline}
					class="z-action-bar-value--accent max-w-[12rem] truncate"
					title={summary.detail ?? summary.headline}
				/>
			</span>
			<!-- Phone: the count chip doubles as the Select all / by-state menu
			     (the list-header select control is desktop-only). -->
			<span class="flex shrink-0 md:hidden">
				<MessageListSelectMenu
					placement="top"
					{disabled}
					class="h-11! w-auto! shrink-0 gap-1 rounded-full! px-2.5!"
				>
					<ActionBarValue count={selectedCount} class="z-action-bar-value--accent" />
				</MessageListSelectMenu>
			</span>

			<!-- Every action link stays reachable regardless of pane width:
			     no width-fitting, the row wraps onto extra lines instead. -->
			<ActionBarBody class="flex-wrap overflow-visible">
				<BulkActionsRow {mailboxRouteId} {onBulkAction} menuSide="top" />
			</ActionBarBody>

			<ActionBarClose onclick={handleClose} aria-label="Clear selection">
				<X class="size-4" aria-hidden="true" />
			</ActionBarClose>
		</ActionBarContent>
	</div>
</ActionBar>
