<script lang="ts">
	import { FolderInput } from 'lucide-svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import MoveToMenuItems from '$lib/components/mail/MoveToMenuItems.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { toast } from '$lib/stores/toast.svelte';
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

	const menuId = $derived(`move-to-menu-${message.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`);

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

	function onMenuKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
		}
	}
</script>

<svelte:window onclick={() => (open = false)} />

<div class="relative">
	<IconButton
		label="Move to folder"
		class={className}
		ariaExpanded={open}
		ariaControls={menuId}
		ariaHaspopup="menu"
		onclick={(e) => {
			e.stopPropagation();
			open = !open;
		}}
	>
		<FolderInput class="size-5" />
	</IconButton>

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			id={menuId}
			role="menu"
			tabindex="-1"
			class="z-overflow-menu"
			onpointerdown={(e) => e.stopPropagation()}
			onkeydown={onMenuKeydown}
		>
			<MoveToMenuItems {currentMailboxRouteId} onSelect={moveTo} />
		</div>
	{/if}
</div>
