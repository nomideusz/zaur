<script lang="ts">
	import { moveTargetMailboxes } from '$lib/mail/mailboxes';
	import MenuItem from '$lib/components/ui/menu/MenuItem.svelte';
	import { mail } from '$lib/stores/mail.svelte';

	interface Props {
		currentMailboxRouteId: string;
		onSelect: (targetRouteId: string) => void;
	}

	let { currentMailboxRouteId, onSelect }: Props = $props();

	const currentMailbox = $derived(mail.mailboxByRouteId(currentMailboxRouteId));
	const options = $derived(moveTargetMailboxes(mail.mailboxes, currentMailbox));
</script>

{#if options.length}
	<div class="z-overflow-menu-scroll">
		{#each options as mailbox (mailbox.id)}
			<MenuItem
				label={`Move to ${mailbox.name}`}
				value={mailbox.id}
				onSelect={() => onSelect(mailbox.id)}
			/>
		{/each}
	</div>
{/if}
