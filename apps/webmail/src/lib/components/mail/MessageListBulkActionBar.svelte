<script lang="ts">
	/**
	 * Bulk selection action bar — Shark UI @shark/action-bar `example-table` pattern:
	 * controlled open, inline toolbar below the message list, More menu, destructive delete, close.
	 * Desktop only — on phones the mobile island renders the same BulkActionsRow.
	 * The ActionBar root still wraps the list on all sizes so Escape clears selection.
	 */
	import BulkActionsRow from '$lib/components/mail/BulkActionsRow.svelte';
	import X from '$lib/components/icons/X.svelte';
	import {
		ActionBar,
		ActionBarBody,
		ActionBarClose,
		ActionBarContent,
		ActionBarSeparator,
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

	const selectedCount = $derived(mail.selectedMessageIds.size);
	const isOpen = $derived(mail.hasSelection && selectedCount > 0);

	const ghostBtnClass = 'min-h-8 min-w-8 gap-1.5 px-2 py-1.5 text-sm font-medium text-fg';

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
			class={cn('max-md:hidden', disabled && 'pointer-events-none opacity-60')}
		>
			<ActionBarValue count={selectedCount} />

			<ActionBarSeparator />

			<ActionBarBody>
				<BulkActionsRow {mailboxRouteId} {onBulkAction} menuSide="top" />
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
