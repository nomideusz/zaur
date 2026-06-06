<script lang="ts">
	import { getContext } from 'svelte';
	import { moveTargetMailboxes } from '$lib/mail/mailboxes';
	import { OVERFLOW_MENU_CTX, type OverflowMenuContext } from '$lib/components/ui/overflow-menu-context';
	import {
		bulkAffectedLabel,
		bulkSelectionReadCount,
		type BulkSelectionCounts
	} from '$lib/components/mail/bulk-selection-label';
	import { LABEL_MARK_IMPORTANT, LABEL_NOT_IMPORTANT, LABEL_REMOVE_IMPORTANT, LABEL_RESTORE_NEW } from '$lib/mail/new-mail';
	import { mail } from '$lib/stores/mail.svelte';

	interface Props {
		mailboxRouteId: string;
		selectedCount: number;
		counts: BulkSelectionCounts;
		canMarkImportant: boolean;
		onDone: () => void;
		onMarkNew: () => void;
		onMarkImportant: () => void;
		onRemoveImportant: () => void;
		onMove: (targetRouteId: string) => void;
	}

	let {
		mailboxRouteId,
		selectedCount,
		counts,
		canMarkImportant,
		onDone,
		onMarkNew,
		onMarkImportant,
		onRemoveImportant,
		onMove
	}: Props = $props();

	const overflowMenu = getContext<OverflowMenuContext | undefined>(OVERFLOW_MENU_CTX);
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const moveTargets = $derived(moveTargetMailboxes(mail.mailboxes, currentMailbox));
	const readCount = $derived(bulkSelectionReadCount(counts));

	const showStateActions = $derived(
		counts.new > 0 ||
			readCount > 0 ||
			(canMarkImportant && counts.notImportant > 0) ||
			counts.important > 0
	);

	function run(action: () => void) {
		action();
		overflowMenu?.close();
	}

	function moveTo(targetRouteId: string) {
		onMove(targetRouteId);
		overflowMenu?.close();
	}
</script>

<div class="z-overflow-menu-scroll">
	{#if counts.new > 0}
		<button type="button" class="z-overflow-menu-item" role="menuitem" onclick={() => run(onDone)}>
			{bulkAffectedLabel(LABEL_NOT_IMPORTANT, counts.new, selectedCount)}
		</button>
	{/if}
	{#if readCount > 0}
		<button type="button" class="z-overflow-menu-item" role="menuitem" onclick={() => run(onMarkNew)}>
			{bulkAffectedLabel(LABEL_RESTORE_NEW, readCount, selectedCount)}
		</button>
	{/if}
	{#if canMarkImportant && counts.notImportant > 0}
		<button
			type="button"
			class="z-overflow-menu-item"
			role="menuitem"
			onclick={() => run(onMarkImportant)}
		>
			{bulkAffectedLabel(LABEL_MARK_IMPORTANT, counts.notImportant, selectedCount)}
		</button>
	{/if}
	{#if counts.important > 0}
		<button
			type="button"
			class="z-overflow-menu-item"
			role="menuitem"
			onclick={() => run(onRemoveImportant)}
		>
			{bulkAffectedLabel(LABEL_REMOVE_IMPORTANT, counts.important, selectedCount)}
		</button>
	{/if}
	{#if showStateActions && moveTargets.length > 0}
		<div class="mx-4 my-1 border-t border-border" role="separator"></div>
	{/if}
	{#each moveTargets as mailbox (mailbox.id)}
		<button
			type="button"
			class="z-overflow-menu-item"
			role="menuitem"
			onclick={() => moveTo(mailbox.id)}
		>
			<span class="truncate">Move to {mailbox.name}</span>
		</button>
	{/each}
</div>
