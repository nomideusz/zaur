<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		Archive,
		Forward,
		Mail,
		MailOpen,
		Reply,
		ReplyAll,
		Shield,
		Star,
		Trash2
	} from 'lucide-svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import MoveToMenu from '$lib/components/mail/MoveToMenu.svelte';
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
		class?: string;
	}

	let { thread, mailboxRouteId, onMoved, class: className = '' }: Props = $props();

	const pane = getContext<MailPaneContext>(MAIL_PANE_CTX);

	const latest = $derived(thread.at(-1));
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Delete');
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
</script>

{#if latest}
	<div class={cn('flex shrink-0 items-center gap-0.5', className)}>
		{#if !settings.minimalReaderToolbar}
			<IconButton
				label={latest.starred ? 'Unstar' : 'Star'}
				class="!p-1.5"
				onclick={toggleStar}
			>
				<Star class={cn('size-3.5', latest.starred && 'fill-star text-star')} aria-hidden="true" />
			</IconButton>
		{/if}
		<IconButton
			label={latest.unread ? 'Mark as read' : 'Mark as unread'}
			class="!p-1.5"
			onclick={toggleLatestRead}
		>
			{#if latest.unread}
				<MailOpen class="size-3.5" />
			{:else}
				<Mail class="size-3.5" />
			{/if}
		</IconButton>
		<IconButton label={primaryReplyLabel} class="!p-1.5" onclick={primaryReply}>
			{#if settings.defaultReplyMode === 'reply-all'}
				<ReplyAll class="size-3.5" />
			{:else}
				<Reply class="size-3.5" />
			{/if}
		</IconButton>
		{#if !settings.minimalReaderToolbar}
			<IconButton label="Reply all" class="!p-1.5" onclick={replyAll}>
				<ReplyAll class="size-3.5" />
			</IconButton>
			<IconButton label="Forward" class="!p-1.5" onclick={forward}>
				<Forward class="size-3.5" />
			</IconButton>
		{/if}
		{#if hasBlockedExternal && !allowExternal && settings.hideExternalContentBanner}
			<IconButton label="Show external images" class="!p-1.5" onclick={showImagesOnce}>
				<Shield class="size-3.5" />
			</IconButton>
		{/if}
		<IconButton label="Archive" class="!p-1.5" onclick={archiveMessage}>
			<Archive class="size-3.5" />
		</IconButton>
		{#if auth.client}
			<MoveToMenu
				message={latest}
				currentMailboxRouteId={mailboxRouteId}
				client={auth.client}
				{onMoved}
				class="!p-1.5"
			/>
		{/if}
		<IconButton
			label={deleteLabel}
			class="!p-1.5 text-danger hover:bg-danger/10"
			onclick={deleteMessage}
		>
			<Trash2 class="size-3.5" />
		</IconButton>
	</div>
{/if}
