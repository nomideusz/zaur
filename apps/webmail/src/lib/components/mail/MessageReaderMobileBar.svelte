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
	import X from '$lib/components/icons/X.svelte';
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
		quickReply?: string;
		quickReplySending?: boolean;
		onQuickReplyChange?: (value: string) => void;
		onSendQuickReply?: () => void;
	}

	let {
		thread,
		mailboxRouteId,
		onMoved,
		quickReply = $bindable(''),
		quickReplySending = false,
		onSendQuickReply
	}: Props = $props();

	const pane = getContext<MailPaneContext | undefined>(MAIL_PANE_CTX);

	let quickReplyOpen = $state(false);
	let quickReplyInput = $state<HTMLTextAreaElement | null>(null);

	const latest = $derived(thread.at(-1));
	const isDraft = $derived(mailboxRouteId === 'drafts');
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const canArchive = $derived(mail.canArchiveFrom(currentMailbox));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Delete');
	const markReadLabel = $derived(latest?.unread ? 'Mark read' : 'Mark unread');
	const primaryReplyLabel = $derived(
		settings.defaultReplyMode === 'reply-all' ? 'Reply all' : 'Reply'
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
	const showQuickReplyPanel = $derived(
		!isDraft && settings.showQuickReply && quickReplyOpen && !!auth.client
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

	function openQuickReply() {
		if (settings.showQuickReply) {
			quickReplyOpen = true;
			requestAnimationFrame(() => {
				quickReplyInput?.focus();
				quickReplyInput?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
			});
			return;
		}
		primaryReply();
	}

	function closeQuickReply() {
		quickReplyOpen = false;
	}

	function onQuickReplyKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeQuickReply();
			return;
		}
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			event.preventDefault();
			onSendQuickReply?.();
		}
	}
</script>

{#if latest && !mail.hasSelection}
	<div class="z-mobile-reader-bar md:hidden">
		{#if showQuickReplyPanel}
			<div class="z-mobile-reader-bar__compose">
				<div class="z-mobile-reader-bar__compose-head">
					<span class="text-sm font-medium text-fg">{primaryReplyLabel}</span>
					<IconButton label="Close quick reply" class="!min-h-8 !min-w-8" onclick={closeQuickReply}>
						<X class="size-4" aria-hidden="true" />
					</IconButton>
				</div>
				<textarea
					bind:this={quickReplyInput}
					class="z-input z-compose-editor min-h-[4.5rem] w-full resize-none py-2.5 leading-relaxed"
					rows={3}
					placeholder="Write your reply…"
					aria-label="Quick reply"
					bind:value={quickReply}
					disabled={quickReplySending}
					onkeydown={onQuickReplyKeydown}
					onfocus={() => quickReplyInput?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}
				></textarea>
				<div class="flex items-center gap-2">
					<Button
						class="min-h-11 flex-1"
						disabled={!quickReply.trim() || quickReplySending}
						onclick={() => onSendQuickReply?.()}
					>
						{quickReplySending ? 'Sending…' : 'Send'}
					</Button>
					<Button variant="ghost" class="min-h-11 shrink-0" onclick={primaryReply}>Full reply</Button>
				</div>
			</div>
		{/if}

		<div class="z-mobile-reader-bar__actions">
			{#if isDraft}
				<Button class="min-h-11 flex-1" onclick={editDraft}>
					<Pencil class="size-4" aria-hidden="true" />
					Edit draft
				</Button>
				<Button class="min-h-11 flex-1" onclick={() => void sendDraft()}>
					<Send class="size-4" aria-hidden="true" />
					Send
				</Button>
				<OverflowMenu
					label="More message actions"
					menuId="mobile-thread-actions-menu"
					placement="top"
				>
					<OverflowMenuItem label={markReadLabel} onclick={toggleLatestRead}>
						{#snippet icon()}
							{#if latest.unread}
								<MailOpen class="size-5" aria-hidden="true" />
							{:else}
								<Mail class="size-5" aria-hidden="true" />
							{/if}
						{/snippet}
					</OverflowMenuItem>
					<OverflowMenuItem label={latest.starred ? 'Unstar' : 'Star'} onclick={toggleStar}>
						{#snippet icon()}<Star class="size-5" aria-hidden="true" />{/snippet}
					</OverflowMenuItem>
					{#if auth.client}
						<MoveToMenuItems currentMailboxRouteId={mailboxRouteId} onSelect={moveTo} />
					{/if}
					<div class="mx-4 my-1 border-t border-border" role="separator"></div>
					<OverflowMenuItem label={deleteLabel} danger onclick={deleteMessage}>
						{#snippet icon()}<Trash2 class="size-5" aria-hidden="true" />{/snippet}
					</OverflowMenuItem>
				</OverflowMenu>
			{:else if showQuickReplyPanel}
				<Button variant="ghost" class="min-h-11 flex-1" onclick={closeQuickReply}>Done</Button>
			{:else}
				<Button class="min-h-11 flex-1" onclick={openQuickReply}>
					{#if settings.defaultReplyMode === 'reply-all'}
						<ReplyAll class="size-4" aria-hidden="true" />
					{:else}
						<Reply class="size-4" aria-hidden="true" />
					{/if}
					{primaryReplyLabel}
				</Button>

				{#if canArchive}
					<IconButton
						label="Archive"
						class={cn('z-mobile-reader-bar__icon-btn', 'text-fg')}
						onclick={archiveMessage}
					>
						<Archive class="size-5" aria-hidden="true" />
					</IconButton>
				{/if}

				<OverflowMenu
					label="More message actions"
					menuId="mobile-thread-actions-menu"
					placement="top"
				>
					<OverflowMenuItem label={markReadLabel} onclick={toggleLatestRead}>
						{#snippet icon()}
							{#if latest.unread}
								<MailOpen class="size-5" aria-hidden="true" />
							{:else}
								<Mail class="size-5" aria-hidden="true" />
							{/if}
						{/snippet}
					</OverflowMenuItem>
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
					{#if !settings.showQuickReply}
						<OverflowMenuItem label={primaryReplyLabel} onclick={primaryReply}>
							{#snippet icon()}
								{#if settings.defaultReplyMode === 'reply-all'}
									<ReplyAll class="size-5" aria-hidden="true" />
								{:else}
									<Reply class="size-5" aria-hidden="true" />
								{/if}
							{/snippet}
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
	</div>
{/if}
