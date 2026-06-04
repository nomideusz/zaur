<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Forward from '$lib/components/icons/Forward.svelte';
	import Important from '$lib/components/icons/Important.svelte';
	import Pencil from '$lib/components/icons/Pencil.svelte';
	import Reply from '$lib/components/icons/Reply.svelte';
	import ReplyAll from '$lib/components/icons/ReplyAll.svelte';
	import Send from '$lib/components/icons/Send.svelte';
	import Shield from '$lib/components/icons/Shield.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
	import MoveToMenuItems from '$lib/components/mail/MoveToMenuItems.svelte';
	import { threadActionMessage } from '$lib/components/mail/message-list-utils';
	import {
		LABEL_CLEAR_NEW,
		LABEL_MARK_IMPORTANT,
		LABEL_NOT_IMPORTANT,
		LABEL_RESTORE_NEW
	} from '$lib/mail/new-mail';
	import { INBOX_MAILBOX_ROUTE_ID, mailListHref } from '$lib/mail/routes';
	import { getContext } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { canMarkImportantFromMailboxRole, moveTargetMailboxes } from '$lib/mail/mailboxes';
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
		/** Navigate to the list after marking unread (Important triage). */
		onBackToList?: () => void;
	}

	let { thread, mailboxRouteId, onMoved, onBackToList }: Props = $props();

	const pane = getContext<MailPaneContext | undefined>(MAIL_PANE_CTX);

	const latest = $derived(thread.at(-1));
	const actionMessage = $derived(
		threadActionMessage(thread, $page.url.searchParams.get('messageId'), mail.messages)
	);
	const isDraft = $derived(mailboxRouteId === 'drafts');
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const draftMoveTargets = $derived(
		isDraft ? moveTargetMailboxes(mail.mailboxes, currentMailbox) : []
	);
	const showDraftOverflowMenu = $derived(isDraft && draftMoveTargets.length > 0);
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
	const primaryReplyMode = $derived(settings.defaultReplyMode);
	const primaryReplyLabel = $derived(primaryReplyMode === 'reply-all' ? 'Reply all' : 'Reply');
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

	function primaryReply() {
		if (primaryReplyMode === 'reply-all') replyAll();
		else reply();
	}

	async function sendDraft() {
		if (!auth.client || !auth.username || !latest) return;

		compose.openDraft(latest);
		const senderName = settings.resolvedDisplayName(auth.displayName ?? auth.username);
		const destination = mailListHref(INBOX_MAILBOX_ROUTE_ID);
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

	async function fileAsNotImportant() {
		if (!auth.client || !actionMessage) return;
		if (!actionMessage.important && !actionMessage.unread) return;
		try {
			await mail.fileAsNotImportant(auth.client, actionMessage);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: `Could not mark ${LABEL_NOT_IMPORTANT.toLowerCase()}`;
			toast.show(message, 'error');
		}
	}

	async function markUnread() {
		if (!auth.client || !actionMessage || actionMessage.unread) return;
		onBackToList?.();
		try {
			await mail.markMessageNew(auth.client, actionMessage);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not mark as unread';
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

	async function toggleSpam() {
		if (!auth.client || !actionMessage) return;
		const toJunk = currentMailbox?.role !== 'junk';
		try {
			await mail.moveMessageToMailbox(auth.client, actionMessage, toJunk ? 'junk' : 'inbox');
			onMoved?.();
		} catch (error) {
			const label = toJunk ? 'mark as spam' : 'restore message';
			const message = error instanceof Error ? error.message : `Could not ${label}`;
			toast.show(message, 'error');
		}
	}
</script>

{#if latest}
	<div class="z-reader-toolbar flex shrink-0 items-center gap-1">
		{#if isDraft}
			<div class="flex items-center gap-1">
				<Button variant="ghost" href="/mail/compose?draft={latest.id}">
					<Pencil class="size-4" aria-hidden="true" />
					Edit
				</Button>
				<Button variant="ghost" class="z-mail-list-bulk-header__danger" onclick={deleteMessage}>
					<Trash2 class="size-4" aria-hidden="true" />
					{deleteLabel}
				</Button>
			</div>
			<Button class="ms-4" onclick={() => void sendDraft()}>
				<Send class="size-4" aria-hidden="true" />
				Send
			</Button>
		{:else}
			<Button onclick={primaryReply}>
				{#if primaryReplyMode === 'reply-all'}
					<ReplyAll class="size-4" aria-hidden="true" />
				{:else}
					<Reply class="size-4" aria-hidden="true" />
				{/if}
				{primaryReplyLabel}
			</Button>
		{/if}

		{#if !isDraft || showDraftOverflowMenu}
			<OverflowMenu label="Message actions" menuId="reader-actions-menu" placement="bottom">
				{#if isDraft}
					{#if auth.client}
						<MoveToMenuItems currentMailboxRouteId={mailboxRouteId} onSelect={moveTo} />
					{/if}
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
				{#if actionMessage?.unread}
					<OverflowMenuItem label={LABEL_CLEAR_NEW} onclick={fileAsNotImportant} />
				{:else if actionMessage}
					<OverflowMenuItem label={LABEL_RESTORE_NEW} onclick={() => void markUnread()} />
				{/if}
				<div class="mx-4 my-1 border-t border-border" role="separator"></div>
				{#if actionMessage?.important}
					<OverflowMenuItem label={LABEL_NOT_IMPORTANT} onclick={fileAsNotImportant}>
						{#snippet icon()}
							<Important class="size-5 text-accent" aria-hidden="true" />
						{/snippet}
					</OverflowMenuItem>
				{:else if canMarkImportant}
					<OverflowMenuItem label={LABEL_MARK_IMPORTANT} onclick={toggleImportant}>
						{#snippet icon()}<Important class="size-5" aria-hidden="true" />{/snippet}
					</OverflowMenuItem>
				{/if}
				{#if auth.client && mailboxRouteId !== 'trash'}
					{#if currentMailbox?.role === 'junk'}
						<OverflowMenuItem label="Not spam" onclick={toggleSpam}>
							{#snippet icon()}<Shield class="size-5" aria-hidden="true" />{/snippet}
						</OverflowMenuItem>
					{:else}
						<OverflowMenuItem label="Mark spam" onclick={toggleSpam}>
							{#snippet icon()}<Shield class="size-5" aria-hidden="true" />{/snippet}
						</OverflowMenuItem>
					{/if}
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
	</div>
{/if}
