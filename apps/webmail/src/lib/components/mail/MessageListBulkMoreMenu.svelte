<script lang="ts">
	import { getContext } from 'svelte';
	import { DropdownMenu } from 'bits-ui';
	import { moveTargetMailboxes } from '$lib/mail/mailboxes';
	import { OVERFLOW_MENU_CTX, type OverflowMenuContext } from '$lib/components/ui/overflow-menu-context';
	import {
		bulkAffectedLabel,
		bulkSelectionReadCount,
		type BulkSelectionCounts
	} from '$lib/components/mail/bulk-selection-label';
	import {
		LABEL_MARK_IMPORTANT,
		LABEL_MARK_SEEN,
		LABEL_NOT_IMPORTANT,
		LABEL_REMOVE_IMPORTANT,
		LABEL_RESTORE_NEW
	} from '$lib/mail/new-mail';
	import { mail } from '$lib/stores/mail.svelte';

	interface Props {
		mailboxRouteId: string;
		selectedCount: number;
		counts: BulkSelectionCounts;
		canMarkImportant: boolean;
		onDone: () => void;
		onMarkSeen: () => void;
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
		onMarkSeen,
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
		<DropdownMenu.Item
			class="z-overflow-menu-item"
			textValue={LABEL_MARK_SEEN}
			onSelect={() => run(onMarkSeen)}
		>
			{bulkAffectedLabel(LABEL_MARK_SEEN, counts.new, selectedCount)}
		</DropdownMenu.Item>
		<DropdownMenu.Item
			class="z-overflow-menu-item"
			textValue={LABEL_NOT_IMPORTANT}
			onSelect={() => run(onDone)}
		>
			{bulkAffectedLabel(LABEL_NOT_IMPORTANT, counts.new, selectedCount)}
		</DropdownMenu.Item>
	{/if}
	{#if readCount > 0}
		<DropdownMenu.Item
			class="z-overflow-menu-item"
			textValue={LABEL_RESTORE_NEW}
			onSelect={() => run(onMarkNew)}
		>
			{bulkAffectedLabel(LABEL_RESTORE_NEW, readCount, selectedCount)}
		</DropdownMenu.Item>
	{/if}
	{#if canMarkImportant && counts.notImportant > 0}
		<DropdownMenu.Item
			class="z-overflow-menu-item"
			textValue={LABEL_MARK_IMPORTANT}
			onSelect={() => run(onMarkImportant)}
		>
			{bulkAffectedLabel(LABEL_MARK_IMPORTANT, counts.notImportant, selectedCount)}
		</DropdownMenu.Item>
	{/if}
	{#if counts.important > 0}
		<DropdownMenu.Item
			class="z-overflow-menu-item"
			textValue={LABEL_REMOVE_IMPORTANT}
			onSelect={() => run(onRemoveImportant)}
		>
			{bulkAffectedLabel(LABEL_REMOVE_IMPORTANT, counts.important, selectedCount)}
		</DropdownMenu.Item>
	{/if}
	{#if showStateActions && moveTargets.length > 0}
		<DropdownMenu.Separator class="mx-2 my-1 h-px bg-border" />
	{/if}
	{#each moveTargets as mailbox (mailbox.id)}
		<DropdownMenu.Item
			class="z-overflow-menu-item"
			textValue={`Move to ${mailbox.name}`}
			onSelect={() => moveTo(mailbox.id)}
		>
			<span class="truncate">Move to {mailbox.name}</span>
		</DropdownMenu.Item>
	{/each}
</div>
