<script lang="ts">
	import { FolderInput } from 'lucide-svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';
	import type { JMAPClient } from '$lib/jmap/client';
	import type { MessagePreview } from '$lib/types/mail';

	interface Props {
		message: MessagePreview;
		currentMailboxRouteId: string;
		client: JMAPClient;
		onMoved?: () => void;
		class?: string;
	}

	let { message, currentMailboxRouteId, client, onMoved, class: className }: Props = $props();

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
			const message = error instanceof Error ? error.message : 'Could not move message';
			toast.show(message, 'error');
		}
	}
</script>

<svelte:window onclick={() => (open = false)} />

<div class="relative">
	<IconButton
		label="Move to folder"
		class={className}
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
			{#if !settings.hideMoveMenuLabels}
				<p class={cn('px-3 text-xs font-medium text-fg-subtle', settings.compactMoveMenu ? 'py-1' : 'py-1.5')}>
					Move to
				</p>
			{/if}
			{#each options as mailbox (mailbox.id)}
				<button
					type="button"
					class={cn(
						'block w-full truncate px-3 text-left text-sm text-fg hover:bg-surface-sunken',
						settings.compactMoveMenu ? 'py-1.5' : 'py-2'
					)}
					onclick={() => moveTo(mailbox.id)}
				>
					{mailbox.name}
				</button>
			{/each}
		</div>
	{/if}
</div>
