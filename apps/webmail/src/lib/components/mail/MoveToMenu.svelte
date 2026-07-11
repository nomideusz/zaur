<script lang="ts">
	import { errorMessage } from '@zaur/mail-core/utils/errors';
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import FolderInput from '$lib/components/icons/FolderInput.svelte';
	import MoveToMenuItems from '$lib/components/mail/MoveToMenuItems.svelte';
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
	<Menu.Root
		{open}
		onOpenChange={(details) => {
			open = details.open;
		}}
		positioning={{ placement: 'bottom-end', gutter: 8, overflowPadding: 12 }}
		ids={{ content: menuId }}
		lazyMount
		unmountOnExit
	>
		<div class={cn('relative shrink-0', className)}>
			<Menu.Trigger
				aria-label="Move to folder"
				class="z-btn-icon min-h-5 min-w-5 p-0"
				onclick={(event) => event.stopPropagation()}
			>
				<FolderInput class="size-3.5" aria-hidden="true" />
			</Menu.Trigger>

			<Portal>
				<Menu.Positioner>
					<Menu.Content
						class="z-overflow-menu z-overflow-menu--fixed w-72 min-w-64 max-w-[calc(100vw-1rem)]"
						onpointerdown={(event) => event.stopPropagation()}
					>
						<MoveToMenuItems {currentMailboxRouteId} onSelect={moveTo} />
					</Menu.Content>
				</Menu.Positioner>
			</Portal>
		</div>
	</Menu.Root>
{/if}
