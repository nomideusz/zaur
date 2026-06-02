<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Forward from '$lib/components/icons/Forward.svelte';
	import Important from '$lib/components/icons/Important.svelte';
	import Reply from '$lib/components/icons/Reply.svelte';
	import ReplyAll from '$lib/components/icons/ReplyAll.svelte';
	import Shield from '$lib/components/icons/Shield.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
	import MoveToMenuItems from '$lib/components/mail/MoveToMenuItems.svelte';
	import { threadActionMessage } from '$lib/components/mail/message-list-utils';
	import { getContext } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { canMarkImportantFromMailboxRole } from '$lib/mail/mailboxes';
	import { compose } from '$lib/stores/compose.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { renderMessageBody } from '$lib/email/html';
	import { MAIL_PANE_CTX, type MailPaneContext } from '$lib/components/mail/mail-pane-context';
	import type { MessageDetail } from '$lib/types/mail';

	interface Props {
		thread: MessageDetail[];
		mailboxRouteId: string;
		onMoved?: () => void;
		/** Text-nav overflow trigger for the reader header row. */
		header?: boolean;
		/** Done / Mark as new live on the nav row — omit from the menu. */
		hideTriageInMenu?: boolean;
		/** Reply mode promoted on the nav row — omit its duplicate from the menu. */
		primaryReplyMode?: 'reply' | 'reply-all';
	}

	let {
		thread,
		mailboxRouteId,
		onMoved,
		header = false,
		hideTriageInMenu = false,
		primaryReplyMode = 'reply'
	}: Props = $props();

	const pane = getContext<MailPaneContext | undefined>(MAIL_PANE_CTX);

	const latest = $derived(thread.at(-1));
	const actionMessage = $derived(
		threadActionMessage(thread, $page.url.searchParams.get('messageId'), mail.messages)
	);
	const isDraft = $derived(mailboxRouteId === 'drafts');
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Trash');
	const canMarkImportant = $derived(canMarkImportantFromMailboxRole(currentMailbox?.role));
	const allowExternal = $derived(!settings.blockExternalContent || pane?.showImagesOnce);
	const hasBlockedExternal = $derived(
		thread.some((message) =>
			renderMessageBody({
				bodyHtml: message.bodyHtml,
				bodyText: message.bodyText,
				allowExternal: false
			}).blockedExternal
		)
	);
	const showReplyInMenu = $derived(primaryReplyMode !== 'reply');
	const showReplyAllInMenu = $derived(primaryReplyMode !== 'reply-all');

	async function withClient(action: (client: NonNullable<typeof auth.client>) => Promise<void>) {
		if (!auth.client || !actionMessage) return;
		try {
			await action(auth.client);
			onMoved?.();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Action failed';
			toast.show(message, 'error');
		}
	}

	function reply() {
		if (!latest) return;
		compose.startReply(latest);
		goto('/mail/compose?mode=reply');
	}

	function replyAll() {
		if (!latest || !auth.username) return;
		compose.startReplyAll(latest, thread, auth.username);
		goto('/mail/compose?mode=reply-all');
	}

	function forward() {
		if (!latest) return;
		compose.startForward(latest);
		goto('/mail/compose?mode=forward');
	}

	function deleteMessage() {
		if (!actionMessage) return;
		const permanent = currentMailbox?.role === 'trash';
		if (!settings.confirmDeleteMessage(1, permanent)) return;
		void withClient((client) => mail.deleteMessage(client, actionMessage, mailboxRouteId));
	}

	function toggleImportant() {
		if (!auth.client || !actionMessage) return;
		void mail.toggleImportant(auth.client, actionMessage).catch((error) => {
			const message = error instanceof Error ? error.message : 'Could not update important';
			toast.show(message, 'error');
		});
	}

	async function markDone() {
		if (!auth.client || !actionMessage?.unread) return;
		try {
			await mail.markMessageDone(auth.client, actionMessage);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not mark as done';
			toast.show(message, 'error');
		}
	}

	async function markNew() {
		if (!auth.client || !actionMessage || actionMessage.unread) return;
		try {
			await mail.markMessageNew(auth.client, actionMessage);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not mark as new';
			toast.show(message, 'error');
		}
	}

	function showImagesOnce() {
		pane?.setShowImagesOnce(true);
	}

	async function moveTo(targetRouteId: string) {
		if (!auth.client || !actionMessage) return;
		try {
			await mail.moveMessageToMailbox(auth.client, actionMessage, targetRouteId);
			onMoved?.();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not move message';
			toast.show(message, 'error');
		}
	}
</script>

{#if latest}
	<OverflowMenu
		label="More message actions"
		menuId="reader-header-actions-menu"
		placement={header ? 'bottom' : 'auto'}
		triggerText={header ? 'More' : ''}
		textTrigger={header}
		triggerClass={header ? 'z-mail-text-nav__link' : ''}
		menuClass={header ? 'z-overflow-menu--list' : ''}
	>
		{#if isDraft}
			{#if actionMessage?.important}
				<OverflowMenuItem label="Unmark important" onclick={toggleImportant}>
					{#snippet icon()}
						<Important class="size-5 text-accent" aria-hidden="true" />
					{/snippet}
				</OverflowMenuItem>
			{:else if canMarkImportant}
				<OverflowMenuItem label="Mark important" onclick={toggleImportant}>
					{#snippet icon()}<Important class="size-5" aria-hidden="true" />{/snippet}
				</OverflowMenuItem>
			{/if}
			{#if auth.client}
				<MoveToMenuItems currentMailboxRouteId={mailboxRouteId} onSelect={moveTo} />
			{/if}
			<div class="mx-4 my-1 border-t border-border" role="separator"></div>
			<OverflowMenuItem label={deleteLabel} danger onclick={deleteMessage}>
				{#snippet icon()}<Trash2 class="size-5" aria-hidden="true" />{/snippet}
			</OverflowMenuItem>
		{:else}
			{#if showReplyInMenu}
				<OverflowMenuItem label="Reply" onclick={reply}>
					{#snippet icon()}<Reply class="size-5" aria-hidden="true" />{/snippet}
				</OverflowMenuItem>
			{/if}
			{#if showReplyAllInMenu}
				<OverflowMenuItem label="Reply all" onclick={replyAll}>
					{#snippet icon()}<ReplyAll class="size-5" aria-hidden="true" />{/snippet}
				</OverflowMenuItem>
			{/if}
			<OverflowMenuItem label="Forward" onclick={forward}>
				{#snippet icon()}<Forward class="size-5" aria-hidden="true" />{/snippet}
			</OverflowMenuItem>
			{#if !hideTriageInMenu}
				{#if actionMessage?.unread}
					<OverflowMenuItem label="Done" onclick={markDone} />
				{:else}
					<OverflowMenuItem label="Mark as new" onclick={markNew} />
				{/if}
			{/if}
			<div class="mx-4 my-1 border-t border-border" role="separator"></div>
			{#if actionMessage?.important}
				<OverflowMenuItem label="Unmark important" onclick={toggleImportant}>
					{#snippet icon()}
						<Important class="size-5 text-accent" aria-hidden="true" />
					{/snippet}
				</OverflowMenuItem>
			{:else if canMarkImportant}
				<OverflowMenuItem label="Mark important" onclick={toggleImportant}>
					{#snippet icon()}<Important class="size-5" aria-hidden="true" />{/snippet}
				</OverflowMenuItem>
			{/if}
			{#if auth.client}
				<MoveToMenuItems currentMailboxRouteId={mailboxRouteId} onSelect={moveTo} />
			{/if}
			{#if hasBlockedExternal && !allowExternal}
				<OverflowMenuItem label="Show external images" onclick={showImagesOnce}>
					{#snippet icon()}<Shield class="size-5" aria-hidden="true" />{/snippet}
				</OverflowMenuItem>
			{/if}
			<div class="mx-4 my-1 border-t border-border" role="separator"></div>
			<OverflowMenuItem label={deleteLabel} danger onclick={deleteMessage}>
				{#snippet icon()}<Trash2 class="size-5" aria-hidden="true" />{/snippet}
			</OverflowMenuItem>
		{/if}
	</OverflowMenu>
{/if}
