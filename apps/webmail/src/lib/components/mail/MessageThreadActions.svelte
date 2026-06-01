<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Archive from '$lib/components/icons/Archive.svelte';
	import Forward from '$lib/components/icons/Forward.svelte';
	import Important from '$lib/components/icons/Important.svelte';
	import Pencil from '$lib/components/icons/Pencil.svelte';
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
	import { compose } from '$lib/stores/compose.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { mailListHref, INBOX_MAILBOX_ROUTE_ID } from '$lib/mail/routes';
	import { toast } from '$lib/stores/toast.svelte';
	import { renderMessageBody } from '$lib/email/html';
	import { MAIL_PANE_CTX, type MailPaneContext } from '$lib/components/mail/mail-pane-context';
	import { cn } from '$lib/utils/cn';
	import type { MessageDetail } from '$lib/types/mail';

	interface Props {
		thread: MessageDetail[];
		mailboxRouteId: string;
		onMoved?: () => void;
		/** Compact overflow trigger for the reader nav row. */
		header?: boolean;
		/** Show a Send action beside the overflow menu for drafts. */
		showDraftSend?: boolean;
		class?: string;
	}

	let {
		thread,
		mailboxRouteId,
		onMoved,
		header = false,
		showDraftSend = false,
		class: className = ''
	}: Props = $props();

	const pane = getContext<MailPaneContext | undefined>(MAIL_PANE_CTX);

	const latest = $derived(thread.at(-1));
	const actionMessage = $derived(
		threadActionMessage(thread, $page.url.searchParams.get('messageId'), mail.messages)
	);
	const isDraft = $derived(mailboxRouteId === 'drafts');
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Trash');
	const markImportantLabel = $derived(
		actionMessage?.important ? 'Unmark important' : 'Mark important'
	);
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

	function editDraft() {
		if (!latest) return;
		goto(`/mail/compose?draft=${latest.id}`);
	}

	async function sendDraft() {
		if (!auth.client || !auth.username || !latest) return;

		compose.openDraft(latest);
		const senderName = settings.resolvedDisplayName(auth.displayName ?? auth.username);
		const destination = settings.returnToInboxAfterSend
			? mailListHref(INBOX_MAILBOX_ROUTE_ID)
			: mailListHref('sent');
		const result = await compose.send(auth.client, auth.username, senderName, {
			onUndo: () => goto(`/mail/compose?draft=${latest.id}`),
			onComplete: (outcome) => {
				if (outcome === 'sent') goto(destination);
				else if (outcome === 'queued') goto(settings.preferredMailHref());
			}
		});
		if (result === 'pending' || result === 'sent') goto(destination);
		else if (result === 'queued') goto(settings.preferredMailHref());
		else if (result === false) goto(`/mail/compose?draft=${latest.id}`);
	}

	function archiveMessage() {
		if (!actionMessage) return;
		void withClient((client) => mail.moveMessage(client, actionMessage, 'archive'));
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
	<div
		class={cn(
			'flex min-w-0 shrink-0 items-center',
			header ? 'gap-1.5' : 'gap-1',
			className
		)}
	>
		{#if showDraftSend}
			<button type="button" class="z-mail-text-nav__action hidden md:inline-flex" onclick={() => void sendDraft()}>
				Send
			</button>
		{/if}
		{#if isDraft}
			<OverflowMenu
				label="More message actions"
				menuId="reader-header-actions-menu"
				placement={header ? 'bottom' : 'auto'}
				triggerClass={header ? '!min-h-9 !min-w-9' : ''}
			>
				<OverflowMenuItem label="Edit draft" onclick={editDraft}>
					{#snippet icon()}<Pencil class="size-5" aria-hidden="true" />{/snippet}
				</OverflowMenuItem>
				<OverflowMenuItem label={markImportantLabel} onclick={toggleImportant}>
					{#snippet icon()}
						<Important
							class={cn('size-5', actionMessage?.important && 'text-accent')}
							aria-hidden="true"
						/>
					{/snippet}
				</OverflowMenuItem>
				{#if auth.client}
					<MoveToMenuItems currentMailboxRouteId={mailboxRouteId} onSelect={moveTo} />
				{/if}
				<div class="mx-4 my-1 border-t border-border" role="separator"></div>
				<OverflowMenuItem label={deleteLabel} danger onclick={deleteMessage}>
					{#snippet icon()}<Trash2 class="size-5" aria-hidden="true" />{/snippet}
				</OverflowMenuItem>
			</OverflowMenu>
		{:else}
			<OverflowMenu
				label="More message actions"
				menuId="reader-header-actions-menu"
				placement={header ? 'bottom' : 'auto'}
				triggerClass={header ? '!min-h-9 !min-w-9' : ''}
			>
				<OverflowMenuItem label="Reply" onclick={reply}>
					{#snippet icon()}<Reply class="size-5" aria-hidden="true" />{/snippet}
				</OverflowMenuItem>
				<OverflowMenuItem label="Reply all" onclick={replyAll}>
					{#snippet icon()}<ReplyAll class="size-5" aria-hidden="true" />{/snippet}
				</OverflowMenuItem>
				<OverflowMenuItem label="Forward" onclick={forward}>
					{#snippet icon()}<Forward class="size-5" aria-hidden="true" />{/snippet}
				</OverflowMenuItem>
				<div class="mx-4 my-1 border-t border-border" role="separator"></div>
				<OverflowMenuItem label={markImportantLabel} onclick={toggleImportant}>
					{#snippet icon()}
						<Important
							class={cn('size-5', actionMessage?.important && 'text-accent')}
							aria-hidden="true"
						/>
					{/snippet}
				</OverflowMenuItem>
				{#if mail.canArchiveFrom(currentMailbox)}
					<OverflowMenuItem label="Archive" onclick={archiveMessage}>
						{#snippet icon()}<Archive class="size-5" aria-hidden="true" />{/snippet}
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
			</OverflowMenu>
		{/if}
	</div>
{/if}
