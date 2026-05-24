<script lang="ts">
	import { FolderInput } from 'lucide-svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import type { JMAPClient } from '$lib/jmap/client';
	import type { MessagePreview } from '$lib/types/mail';

	interface Props {
		message: MessagePreview;
		currentMailboxRouteId: string;
		client: JMAPClient;
		onMoved?: () => void;
	}

	let { message, currentMailboxRouteId, client, onMoved }: Props = $props();

	let open = $state(false);

	const currentMailbox = $derived(mail.mailboxByRouteId(currentMailboxRouteId));
	const options = $derived(
		mail.mailboxes.filter((mb) => mb.jmapId && mb.id !== currentMailbox?.id)
	);

	async function moveTo(targetRouteId: string) {
		open = false;
		try {
			await mail.moveMessageToMailbox(client, message, targetRouteId);
			onMoved?.();
		} catch (error) {
			console.error(error);
		}
	}
</script>

<svelte:window onclick={() => (open = false)} />

<div class="relative">
	<IconButton
		label="Move to folder"
		onclick={(e) => {
			e.stopPropagation();
			open = !open;
		}}
	>
		<FolderInput class="size-4" />
	</IconButton>

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute right-0 z-20 mt-1 max-h-64 w-52 overflow-y-auto rounded-md border border-border bg-surface-raised py-1 shadow-md"
			onpointerdown={(e) => e.stopPropagation()}
		>
			<p class="px-3 py-1.5 text-xs font-medium text-fg-subtle">Move to</p>
			{#each options as mailbox (mailbox.id)}
				<button
					type="button"
					class="block w-full truncate px-3 py-2 text-left text-sm text-fg hover:bg-surface-sunken"
					onclick={() => moveTo(mailbox.id)}
				>
					{mailbox.name}
				</button>
			{/each}
		</div>
	{/if}
</div>
