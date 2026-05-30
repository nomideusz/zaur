<script lang="ts">
	import Archive from '$lib/components/icons/Archive.svelte';
	import Mail from '$lib/components/icons/Mail.svelte';
	import MailOpen from '$lib/components/icons/MailOpen.svelte';
	import Star from '$lib/components/icons/Star.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import MoveToMenuItems from '$lib/components/mail/MoveToMenuItems.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';
	import type { MessagePreview } from '$lib/types/mail';

	interface Props {
		message: MessagePreview;
		mailboxRouteId: string;
		onMenuOpenChange?: (open: boolean) => void;
	}

	let { message, mailboxRouteId, onMenuOpenChange }: Props = $props();

	const actionRouteId = $derived(mailboxRouteId ?? message.mailboxId);
	const currentMailbox = $derived(mail.mailboxByRouteId(actionRouteId));
	const canArchive = $derived(mail.canArchiveFrom(currentMailbox));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Delete');
	const markReadLabel = $derived(message.unread ? 'Mark read' : 'Mark unread');
	const starLabel = $derived(message.starred ? 'Unstar' : 'Star');
	const menuId = $derived(`message-list-actions-${message.id}`);

	const iconButtonClass = '!min-h-8 !min-w-8 !p-1.5';

	async function runAction(action: () => Promise<void>) {
		if (!auth.client) return;
		try {
			await action();
		} catch (err) {
			const text = err instanceof Error ? err.message : 'Action failed';
			toast.show(text, 'error');
		}
	}

	function toggleRead() {
		if (!auth.client) return;
		void runAction(() => mail.markAsRead(auth.client!, message, message.unread));
	}

	function toggleStar() {
		if (!auth.client) return;
		void runAction(() => mail.toggleStar(auth.client!, message));
	}

	function archive() {
		if (!auth.client) return;
		void runAction(() => mail.moveMessage(auth.client!, message, 'archive'));
	}

	function deleteMessage() {
		if (!auth.client || !actionRouteId) return;
		const permanent = currentMailbox?.role === 'trash';
		if (!settings.confirmDeleteMessage(1, permanent)) return;
		void runAction(() => mail.deleteMessage(auth.client!, message, actionRouteId));
	}

	async function moveTo(targetRouteId: string) {
		if (!auth.client) return;
		try {
			await mail.moveMessageToMailbox(auth.client, message, targetRouteId);
		} catch (error) {
			const text = error instanceof Error ? error.message : 'Could not move message';
			toast.show(text, 'error');
		}
	}

	function stopRowActivation(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="flex shrink-0 items-center gap-0.5"
	role="presentation"
	onclick={stopRowActivation}
	onkeydown={(event) => event.stopPropagation()}
>
	<IconButton label={markReadLabel} class={iconButtonClass} onclick={toggleRead}>
		{#if message.unread}
			<MailOpen class="size-4" aria-hidden="true" />
		{:else}
			<Mail class="size-4" aria-hidden="true" />
		{/if}
	</IconButton>

	{#if settings.showStarsInList}
		<IconButton label={starLabel} class={iconButtonClass} onclick={toggleStar}>
			<Star
				class={cn('size-4', message.starred && 'fill-star text-star')}
				aria-hidden="true"
			/>
		</IconButton>
	{/if}

	{#if canArchive}
		<IconButton label="Archive" class={iconButtonClass} onclick={archive}>
			<Archive class="size-4" aria-hidden="true" />
		</IconButton>
	{/if}

	<IconButton
		label={deleteLabel}
		class={cn(iconButtonClass, 'text-danger hover:bg-danger/10')}
		onclick={deleteMessage}
	>
		<Trash2 class="size-4" aria-hidden="true" />
	</IconButton>

	<OverflowMenu
		label="More message actions"
		{menuId}
		placement="top"
		menuClass="z-overflow-menu--list"
		onOpenChange={onMenuOpenChange}
	>
		{#if !settings.showStarsInList}
			<OverflowMenuItem label={starLabel} onclick={toggleStar}>
				{#snippet icon()}<Star class="size-5" aria-hidden="true" />{/snippet}
			</OverflowMenuItem>
		{/if}
		{#if auth.client}
			<MoveToMenuItems currentMailboxRouteId={actionRouteId} onSelect={moveTo} />
		{/if}
	</OverflowMenu>
</div>
