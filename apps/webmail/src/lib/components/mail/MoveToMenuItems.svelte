<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { moveTargetMailboxes } from '$lib/mail/mailboxes';
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
			<Menu.Item
				class="z-overflow-menu-item"
				value={mailbox.id}
				valueText={`Move to ${mailbox.name}`}
				onSelect={() => onSelect(mailbox.id)}
			>
				<span class="truncate">Move to {mailbox.name}</span>
			</Menu.Item>
		{/each}
	</div>
{/if}
