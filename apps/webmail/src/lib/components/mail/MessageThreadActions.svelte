<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Copy from '$lib/components/icons/Copy.svelte';
	import Eye from '$lib/components/icons/Eye.svelte';
	import EyeOff from '$lib/components/icons/EyeOff.svelte';
	import Forward from '$lib/components/icons/Forward.svelte';
	import Important from '$lib/components/icons/Important.svelte';
	import PencilLine from '$lib/components/icons/PencilLine.svelte';
	import Reply from '$lib/components/icons/Reply.svelte';
	import ReplyAll from '$lib/components/icons/ReplyAll.svelte';
	import Send from '$lib/components/icons/Send.svelte';
	import Shield from '$lib/components/icons/Shield.svelte';
	import ShieldAlert from '$lib/components/icons/ShieldAlert.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import XCircle from '$lib/components/icons/XCircle.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
	import MoveToMenuItems from '$lib/components/mail/MoveToMenuItems.svelte';
	import { threadActionMessage } from '$lib/components/mail/message-list-utils';
	import {
		LABEL_CLEAR_NEW,
		LABEL_MARK_IMPORTANT,
		LABEL_NOT_IMPORTANT,
		LABEL_RESTORE_NEW,
		LABEL_UNSEE
	} from '$lib/mail/new-mail';
	import { INBOX_MAILBOX_ROUTE_ID, mailListHref } from '$lib/mail/routes';
	import { replyFromAddress } from '$lib/mail/reader-delivered-to';
	import { resolveSendFrom } from '$lib/mail/send-from';
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
	import { cn } from '$lib/utils/cn';

	interface Props {
		thread: MessageDetail[];
		mailboxRouteId: string;
		onMoved?: () => void;
		/** Navigate to the list after marking unread (Important triage). */
		onBackToList?: () => void;
		/** Overflow menu opens away from the toolbar — 'top' inside the island. */
		menuPlacement?: 'top' | 'bottom';
		/** Unique menu id — the toolbar mounts twice (reader header + island). */
		menuId?: string;
		/** Compact icon layout for the mobile floating island. */
		variant?: 'default' | 'island';
	}

	let {
		thread,
		mailboxRouteId,
		onMoved,
		onBackToList,
		menuPlacement = 'bottom',
		menuId = 'reader-actions-menu',
		variant = 'default'
	}: Props = $props();

	const isIsland = $derived(variant === 'island');

	const pane = getContext<MailPaneContext | undefined>(MAIL_PANE_CTX);

	const latest = $derived(thread.at(-1));
	const senderEmail = $derived(latest?.from?.email ?? '');
	const actionMessage = $derived(
		threadActionMessage(thread, $page.url.searchParams.get('messageId'), mail.messages)
	);
	const isDraft = $derived(mailboxRouteId === 'drafts');
	const isScheduled = $derived(mailboxRouteId === 'scheduled');
	let cancelingScheduled = $state(false);
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const draftMoveTargets = $derived(
		isDraft ? moveTargetMailboxes(mail.mailboxes, currentMailbox) : []
	);
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
		compose.startReply(latest, replyFromAddress(latest, auth.username, auth.identities));
		goto('/mail/compose?mode=reply');
	}

	function replyAll() {
		if (!latest || !auth.username) return;
		compose.startReplyAll(
			latest,
			thread,
			auth.username,
			replyFromAddress(latest, auth.username, auth.identities)
		);
		goto('/mail/compose?mode=reply-all');
	}

	function forward() {
		if (!latest) return;
		compose.startForward(latest, replyFromAddress(latest, auth.username, auth.identities));
		goto('/mail/compose?mode=forward');
	}

	function primaryReply() {
		if (primaryReplyMode === 'reply-all') replyAll();
		else reply();
	}

	async function sendDraft() {
		if (!auth.client || !auth.username || !latest) return;

		compose.openDraft(latest);
		// Send from the address the draft was written as (e.g. an alias), not
		// always the primary — mirrors the compose panel's From resolution.
		const { email: fromEmail, identity } = resolveSendFrom(
			compose.fromEmail,
			auth.username,
			auth.identities
		);
		const senderName = settings.resolvedDisplayName(
			identity?.name?.trim() || auth.displayName || auth.username
		);
		const destination = mailListHref(INBOX_MAILBOX_ROUTE_ID);
		const result = await compose.send(auth.client, fromEmail, senderName, {
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

	async function cancelScheduledSend() {
		if (!auth.client || !actionMessage || cancelingScheduled) return;
		cancelingScheduled = true;
		try {
			await auth.client.cancelScheduledSend(actionMessage.id);
			toast.show('Sending canceled — message moved to Drafts', 'success');
			await mail.loadMailboxes(auth.client);
			onMoved?.();
		} catch (error) {
			toast.show(error instanceof Error ? error.message : 'Could not cancel send', 'error');
		} finally {
			cancelingScheduled = false;
		}
	}

	async function deleteMessage() {
		if (!actionMessage) return;
		const permanent = currentMailbox?.role === 'trash';
		if (!(await settings.confirmDeleteMessage(1, permanent))) return;
		void withClient((client) => mail.deleteMessage(client, actionMessage, mailboxRouteId));
	}

	function toggleImportant() {
		if (!auth.client || !actionMessage) return;
		void mail.toggleImportant(auth.client, actionMessage).catch((error) => {
			const message = error instanceof Error ? error.message : 'Could not update highlight';
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
					: 'Could not update highlight';
			toast.show(message, 'error');
		}
	}

	async function markUnread() {
		if (!auth.client || !actionMessage || actionMessage.unread) return;
		onBackToList?.();
		try {
			await mail.markMessageNew(auth.client, actionMessage);
		} catch (error) {
			const message = error instanceof Error ? error.message : `Could not ${LABEL_UNSEE.toLowerCase()}`;
			toast.show(message, 'error');
		}
	}

	function showImagesOnce() {
		pane?.setShowImagesOnce(true);
	}

	// In a menu the action closes the popover, so a toast is the right feedback
	// here (the inline CopyButton indicator wouldn't stay visible).
	async function copySenderEmail() {
		if (!senderEmail) return;
		try {
			await navigator.clipboard.writeText(senderEmail);
			toast.show('Email address copied', 'success');
		} catch {
			toast.show('Could not copy email address', 'error');
		}
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
	<div
		class={cn(
			isIsland
				? 'flex min-w-0 flex-1 items-center justify-end gap-0.375rem'
				: 'z-reader-toolbar flex min-w-0 shrink-0 items-center justify-end gap-3'
		)}
	>
		{#if isDraft && !isIsland}
			<a href="/mail/compose?draft={latest.id}" class="z-mail-text-nav__link">Edit</a>
		{/if}

		<OverflowMenu
			label="Message actions"
			{menuId}
			placement={menuPlacement}
			textTrigger={!isIsland}
			triggerText={isIsland ? undefined : 'More'}
			triggerClass={isIsland ? 'z-mobile-island__icon-btn' : 'z-mail-text-nav__link'}
		>
			{#if isIsland && !isDraft}
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
			{/if}
			{#if isDraft}
				{#if auth.client && draftMoveTargets.length}
					<MoveToMenuItems currentMailboxRouteId={mailboxRouteId} onSelect={moveTo} />
					<div class="mx-4 my-1 border-t border-border" role="separator"></div>
				{/if}
				<OverflowMenuItem label={deleteLabel} danger onclick={deleteMessage}>
					{#snippet icon()}<Trash2 class="size-5" aria-hidden="true" />{/snippet}
				</OverflowMenuItem>
			{:else}
				{#if senderEmail}
					<OverflowMenuItem label="Copy email address" onclick={() => void copySenderEmail()}>
						{#snippet icon()}<Copy class="size-5" aria-hidden="true" />{/snippet}
					</OverflowMenuItem>
					<div class="mx-4 my-1 border-t border-border" role="separator"></div>
				{/if}
				{#if actionMessage?.unread}
					<OverflowMenuItem label={LABEL_CLEAR_NEW} onclick={fileAsNotImportant}>
						{#snippet icon()}<Eye class="size-5" aria-hidden="true" />{/snippet}
					</OverflowMenuItem>
				{:else if actionMessage}
					<OverflowMenuItem label={LABEL_RESTORE_NEW} onclick={() => void markUnread()}>
						{#snippet icon()}<EyeOff class="size-5" aria-hidden="true" />{/snippet}
					</OverflowMenuItem>
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
							{#snippet icon()}<ShieldAlert class="size-5" aria-hidden="true" />{/snippet}
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

		{#if isDraft && isIsland}
			<a
				href="/mail/compose?draft={latest.id}"
				class="z-mobile-island__icon-btn no-underline"
				aria-label="Edit draft"
			>
				<PencilLine class="size-[1.125rem]" aria-hidden="true" />
			</a>
		{/if}

		<div class={isIsland ? 'ml-2 shrink-0' : 'z-header-action-zone'}>
			{#if isDraft}
				<button
					type="button"
					class={cn(
						isIsland
							? 'z-mobile-island__icon-btn z-mobile-island__icon-btn--accent'
							: 'z-mail-text-nav__action z-mail-text-nav__action--pill'
					)}
					aria-label="Send draft"
					onclick={() => void sendDraft()}
				>
					{#if isIsland}
						<Send class="size-[1.125rem]" aria-hidden="true" />
					{:else}
						Send
					{/if}
				</button>
			{:else if isScheduled}
				<button
					type="button"
					class={cn(
						isIsland
							? 'z-mobile-island__icon-btn z-mobile-island__icon-btn--accent'
							: 'z-mail-text-nav__action z-mail-text-nav__action--pill'
					)}
					aria-label={cancelingScheduled ? 'Canceling send' : 'Cancel send'}
					disabled={cancelingScheduled}
					onclick={() => void cancelScheduledSend()}
				>
					{#if isIsland}
						<XCircle class="size-[1.125rem]" aria-hidden="true" />
					{:else}
						{cancelingScheduled ? 'Canceling…' : 'Cancel send'}
					{/if}
				</button>
			{:else if isIsland}
				<button
					type="button"
					class="z-mail-text-nav__action z-mail-text-nav__action--pill"
					onclick={primaryReply}
				>
					{primaryReplyLabel}
				</button>
			{:else}
				<!-- Reply, with the other reply modes folded into a split-button caret.
				     Styled as a joined accent pill to match the compose Send control. -->
				<div class="z-reader-reply-split">
					<button
						type="button"
						class="z-mail-text-nav__action z-mail-text-nav__action--pill z-reader-reply-split__main"
						onclick={primaryReply}
					>
						{primaryReplyLabel}
					</button>
					<OverflowMenu
						caretTrigger
						label="Reply options"
						menuId={`${menuId}-reply`}
						placement={menuPlacement}
						triggerClass="z-mail-text-nav__action z-mail-text-nav__action--pill z-reader-reply-split__caret"
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
					</OverflowMenu>
				</div>
			{/if}
		</div>
	</div>
{/if}
