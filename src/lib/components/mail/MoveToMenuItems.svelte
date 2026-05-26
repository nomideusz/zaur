<script lang="ts">
	import { getContext } from 'svelte';
	import { OVERFLOW_MENU_CTX, type OverflowMenuContext } from '$lib/components/ui/overflow-menu-context';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	interface Props {
		currentMailboxRouteId: string;
		onSelect: (targetRouteId: string) => void;
	}

	let { currentMailboxRouteId, onSelect }: Props = $props();

	const overflowMenu = getContext<OverflowMenuContext | undefined>(OVERFLOW_MENU_CTX);

	const currentMailbox = $derived(mail.mailboxByRouteId(currentMailboxRouteId));
	const options = $derived(
		mail.mailboxes.filter((mb) => mb.jmapId && mb.id !== currentMailbox?.id)
	);

	function select(targetRouteId: string) {
		onSelect(targetRouteId);
		overflowMenu?.close();
	}
</script>

{#if options.length}
	{#if !settings.hideMoveMenuLabels}
		<p class="z-overflow-menu-label">Move to</p>
	{/if}
	<div class="z-overflow-menu-scroll">
		{#each options as mailbox (mailbox.id)}
			<button
				type="button"
				class="z-overflow-menu-item"
				onclick={() => select(mailbox.id)}
				role="menuitem"
			>
				<span class="truncate">{mailbox.name}</span>
			</button>
		{/each}
	</div>
{/if}
