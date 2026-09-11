<script lang="ts">
	import { errorMessage } from '@zaur/mail-core/utils/errors';
	import FolderInput from '$lib/components/icons/FolderInput.svelte';
	import MoveToMenuItems from '$lib/components/mail/MoveToMenuItems.svelte';
	import { Menu, MenuSurface, MenuTrigger } from '$lib/components/ui/menu';
	import { moveTargetMailboxes } from '$lib/mail/mailboxes';
	import { mail } from '$lib/stores/mail.svelte';
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

	const menuId = $derived(`move-to-menu-${message.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`);
	const currentMailbox = $derived(mail.mailboxByRouteId(currentMailboxRouteId));
	const hasTargets = $derived(
		moveTargetMailboxes(mail.mailboxes, currentMailbox).length > 0
	);

	async function moveTo(targetRouteId: string) {
		open = false;
		try {
			await mail.moveMessageToMailbox(client, message, targetRouteId);
			onMoved?.();
		} catch (error) {
			const message = errorMessage(error, 'Could not move message');
			toast.show(message, 'error');
		}
	}
</script>

{#if hasTargets}
	<Menu side="bottom" align="end" {menuId} bind:open>
		<div class={cn('relative shrink-0', className)}>
			<MenuTrigger
				aria-label="Move to folder"
				class="z-btn-icon min-h-5 min-w-5 p-0"
				onclick={(event) => event.stopPropagation()}
			>
				<FolderInput class="size-3.5" aria-hidden="true" />
			</MenuTrigger>

			<MenuSurface class="w-72 min-w-64 max-w-[calc(100vw-1rem)]">
				<MoveToMenuItems {currentMailboxRouteId} onSelect={moveTo} />
			</MenuSurface>
		</div>
	</Menu>
{/if}
