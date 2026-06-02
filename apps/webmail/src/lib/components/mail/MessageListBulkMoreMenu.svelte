<script lang="ts">
	import { getContext } from 'svelte';
	import { moveTargetMailboxes } from '$lib/mail/mailboxes';
	import { OVERFLOW_MENU_CTX, type OverflowMenuContext } from '$lib/components/ui/overflow-menu-context';
	import { mail } from '$lib/stores/mail.svelte';

	interface Props {
		mailboxRouteId: string;
		canArchive: boolean;
		onArchive: () => void;
		onMove: (targetRouteId: string) => void;
	}

	let { mailboxRouteId, canArchive, onArchive, onMove }: Props = $props();

	const overflowMenu = getContext<OverflowMenuContext | undefined>(OVERFLOW_MENU_CTX);
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const moveTargets = $derived(moveTargetMailboxes(mail.mailboxes, currentMailbox));

	function archive() {
		onArchive();
		overflowMenu?.close();
	}

	function moveTo(targetRouteId: string) {
		onMove(targetRouteId);
		overflowMenu?.close();
	}
</script>

<div class="z-overflow-menu-scroll">
	{#if canArchive}
		<button type="button" class="z-overflow-menu-item" role="menuitem" onclick={archive}>
			Archive
		</button>
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
