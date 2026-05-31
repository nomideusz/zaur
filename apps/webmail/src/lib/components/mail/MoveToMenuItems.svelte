<script lang="ts">
	import { getContext } from 'svelte';
	import { OVERFLOW_MENU_CTX, type OverflowMenuContext } from '$lib/components/ui/overflow-menu-context';
	import { moveTargetMailboxes } from '$lib/mail/mailboxes';
	import { mail } from '$lib/stores/mail.svelte';

	interface Props {
		currentMailboxRouteId: string;
		onSelect: (targetRouteId: string) => void;
	}

	let { currentMailboxRouteId, onSelect }: Props = $props();

	const overflowMenu = getContext<OverflowMenuContext | undefined>(OVERFLOW_MENU_CTX);

	const currentMailbox = $derived(mail.mailboxByRouteId(currentMailboxRouteId));
	const options = $derived(moveTargetMailboxes(mail.mailboxes, currentMailbox));

	function select(targetRouteId: string) {
		onSelect(targetRouteId);
		overflowMenu?.close();
	}
</script>

{#if options.length}
	<div class="z-overflow-menu-scroll">
		{#each options as mailbox (mailbox.id)}
			<button
				type="button"
				class="z-overflow-menu-item"
				onclick={() => select(mailbox.id)}
				role="menuitem"
			>
				<span class="truncate">Move to {mailbox.name}</span>
			</button>
		{/each}
	</div>
{/if}
