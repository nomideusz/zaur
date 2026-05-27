<script lang="ts">
	import { goto } from '$app/navigation';
	import Archive from '$lib/components/icons/Archive.svelte';
import Forward from '$lib/components/icons/Forward.svelte';
import Mail from '$lib/components/icons/Mail.svelte';
import MailOpen from '$lib/components/icons/MailOpen.svelte';
import Pencil from '$lib/components/icons/Pencil.svelte';
import Reply from '$lib/components/icons/Reply.svelte';
import ReplyAll from '$lib/components/icons/ReplyAll.svelte';
import Send from '$lib/components/icons/Send.svelte';
import Shield from '$lib/components/icons/Shield.svelte';
import Star from '$lib/components/icons/Star.svelte';
import Trash2 from '$lib/components/icons/Trash2.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
	import MoveToMenuItems from '$lib/components/mail/MoveToMenuItems.svelte';
	import { getContext } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose } from '$lib/stores/compose.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { renderMessageBody } from '$lib/email/html';
	import { MAIL_PANE_CTX, type MailPaneContext } from '$lib/components/mail/mail-pane-context';
	import { cn } from '$lib/utils/cn';
	import type { MessageDetail } from '$lib/types/mail';

	interface Props {
		thread: MessageDetail[];
		mailboxRouteId: string;
		onMoved?: () => void;
		/** Reader pane header: avoid fixed button height so title can align with labels. */
		readerHeader?: boolean;
		class?: string;
	}

	let { thread, mailboxRouteId, onMoved, readerHeader = false, class: className = '' }: Props =
		$props();

	const pane = getContext<MailPaneContext>(MAIL_PANE_CTX);

	const latest = $derived(thread.at(-1));
	const isDraft = $derived(mailboxRouteId === 'drafts');
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Delete');
	const markReadLabel = $derived(latest?.unread ? 'Mark read' : 'Mark unread');
	const primaryReplyLabel = $derived(
		settings.defaultReplyMode === 'reply-all' ? 'Reply all' : 'Reply'
	);
	const toolbarButtonClass = $derived(
		cn(
			'z-thread-toolbar-btn shrink-0 !px-3 !text-sm',
			readerHeader ? '!h-auto !min-h-9 leading-none' : '!h-9',
			settings.compactReaderToolbar && '!px-2.5'
		)
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
		if (!auth.client || !latest) return;
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

	function primaryReply() {
		if (settings.defaultReplyMode === 'reply-all') replyAll();
		else reply();
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
		const destination = settings.returnToInboxAfterSend ? '/mail/inbox' : '/mail/sent';
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
		if (!latest) return;
		void withClient((client) => mail.moveMessage(client, latest, 'archive'));
	}

	function deleteMessage() {
		if (!latest) return;
		const permanent = currentMailbox?.role === 'trash';
		if (!settings.confirmDeleteMessage(1, permanent)) return;
		void withClient((client) => mail.deleteMessage(client, latest, mailboxRouteId));
	}

	function toggleStar() {
		if (!auth.client || !latest) return;
		void mail.toggleStar(auth.client, latest);
	}

	function toggleLatestRead() {
		if (!auth.client || !latest) return;
		void mail.markAsRead(auth.client, latest, latest.unread);
	}

	function showImagesOnce() {
		pane?.setShowImagesOnce(true);
	}

	async function moveTo(targetRouteId: string) {
		if (!auth.client || !latest) return;
		try {
			await mail.moveMessageToMailbox(auth.client, latest, targetRouteId);
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
			'flex min-w-0 shrink flex-wrap items-center',
			readerHeader && 'z-reader-subject-toolbar items-baseline',
			readerHeader
				? settings.compactReaderToolbar
					? 'gap-1'
					: 'gap-1.5'
				: settings.compactReaderToolbar
					? 'gap-0'
					: 'gap-1',
			className
		)}
	>
		{#if isDraft}
			{#if settings.minimalReaderToolbar}
				<IconButton label="Edit draft" onclick={editDraft}>
					<Pencil class="size-5" />
				</IconButton>
				<IconButton label={markReadLabel} onclick={toggleLatestRead}>
					{#if latest.unread}
						<MailOpen class="size-5" />
					{:else}
						<Mail class="size-5" />
					{/if}
				</IconButton>
			{:else}
				<Button variant="ghost" class={toolbarButtonClass} onclick={editDraft}>
					<Pencil class="size-4" aria-hidden="true" />
					Edit draft
				</Button>
				<Button variant="ghost" class={toolbarButtonClass} onclick={toggleLatestRead}>
					{#if latest.unread}
						<MailOpen class="size-4" aria-hidden="true" />
					{:else}
						<Mail class="size-4" aria-hidden="true" />
					{/if}
					{markReadLabel}
				</Button>
			{/if}
			<Button class={toolbarButtonClass} onclick={() => void sendDraft()}>
				<Send class="size-4" aria-hidden="true" />
				Send
			</Button>
			{#if settings.minimalReaderToolbar}
				<IconButton
					label={deleteLabel}
					class="text-danger hover:bg-danger/10"
					onclick={deleteMessage}
				>
					<Trash2 class="size-5" />
				</IconButton>
			{:else}
				<Button variant="danger" class={toolbarButtonClass} onclick={deleteMessage}>
					<Trash2 class="size-4" aria-hidden="true" />
					{deleteLabel}
				</Button>
			{/if}
			<OverflowMenu label="More message actions" menuId="thread-actions-overflow-menu">
				<OverflowMenuItem label={latest.starred ? 'Unstar' : 'Star'} onclick={toggleStar}>
					{#snippet icon()}<Star class="size-5" aria-hidden="true" />{/snippet}
				</OverflowMenuItem>
				{#if auth.client}
					<MoveToMenuItems currentMailboxRouteId={mailboxRouteId} onSelect={moveTo} />
				{/if}
			</OverflowMenu>
		{:else}
			{#if settings.minimalReaderToolbar}
				<IconButton label={markReadLabel} onclick={toggleLatestRead}>
					{#if latest.unread}
						<MailOpen class="size-5" />
					{:else}
						<Mail class="size-5" />
					{/if}
				</IconButton>
				<IconButton label={primaryReplyLabel} onclick={primaryReply}>
					{#if settings.defaultReplyMode === 'reply-all'}
						<ReplyAll class="size-5" />
					{:else}
						<Reply class="size-5" />
					{/if}
				</IconButton>
			{:else}
				<Button variant="ghost" class={toolbarButtonClass} onclick={toggleLatestRead}>
					{#if latest.unread}
						<MailOpen class="size-4" aria-hidden="true" />
					{:else}
						<Mail class="size-4" aria-hidden="true" />
					{/if}
					{markReadLabel}
				</Button>
				<Button variant="ghost" class={toolbarButtonClass} onclick={primaryReply}>
					{#if settings.defaultReplyMode === 'reply-all'}
						<ReplyAll class="size-4" aria-hidden="true" />
					{:else}
						<Reply class="size-4" aria-hidden="true" />
					{/if}
					{primaryReplyLabel}
				</Button>
			{/if}
			<OverflowMenu label="More message actions" menuId="thread-actions-overflow-menu">
				<OverflowMenuItem label={latest.starred ? 'Unstar' : 'Star'} onclick={toggleStar}>
					{#snippet icon()}<Star class="size-5" aria-hidden="true" />{/snippet}
				</OverflowMenuItem>
				{#if settings.defaultReplyMode !== 'reply-all'}
					<OverflowMenuItem label="Reply all" onclick={replyAll}>
						{#snippet icon()}<ReplyAll class="size-5" aria-hidden="true" />{/snippet}
					</OverflowMenuItem>
				{:else}
					<OverflowMenuItem label="Reply" onclick={reply}>
						{#snippet icon()}<Reply class="size-5" aria-hidden="true" />{/snippet}
					</OverflowMenuItem>
				{/if}
				<OverflowMenuItem label="Forward" onclick={forward}>
					{#snippet icon()}<Forward class="size-5" aria-hidden="true" />{/snippet}
				</OverflowMenuItem>
				{#if mail.canArchiveFrom(currentMailbox)}
					<OverflowMenuItem label="Archive" onclick={archiveMessage}>
						{#snippet icon()}<Archive class="size-5" aria-hidden="true" />{/snippet}
					</OverflowMenuItem>
				{/if}
				{#if auth.client}
					<MoveToMenuItems currentMailboxRouteId={mailboxRouteId} onSelect={moveTo} />
				{/if}
				{#if hasBlockedExternal && !allowExternal && settings.hideExternalContentBanner}
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
