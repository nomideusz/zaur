import { mail } from '$lib/stores/mail.svelte';
import type { MessagePreview } from '$lib/types/mail';

export function defaultEmptyMessage(mailboxRouteId: string | undefined): string {
	switch (mailboxRouteId) {
		case 'inbox':
			return 'Inbox zero';
		case 'drafts':
			return 'No drafts yet';
		case 'sent':
			return 'Nothing sent yet';
		case 'trash':
			return 'Trash is clear';
		case 'archive':
			return 'Archive is clear';
		case 'junk':
			return 'No junk mail';
		default:
			return 'Nothing here yet';
	}
}

export function defaultEmptyHint(mailboxRouteId: string | undefined): string | null {
	switch (mailboxRouteId) {
		case 'inbox':
			return 'New messages will appear here as soon as they arrive.';
		case 'drafts':
			return 'Start a message and it will be saved here automatically.';
		case 'sent':
			return 'Messages you send will be collected here for easy reference.';
		case 'trash':
			return 'Deleted messages will stay here until you empty them.';
		default:
			return null;
	}
}

export function messageHref(
	message: MessagePreview,
	searchReturnTo: string | null
): string {
	const href = `/mail/${message.mailboxId}/${message.threadId}`;
	const searchParams = new URLSearchParams();
	searchParams.set('messageId', message.id);
	if (searchReturnTo) {
		searchParams.set('returnTo', searchReturnTo);
	}
	return `${href}?${searchParams.toString()}`;
}

export function activeMessageId(
	messages: MessagePreview[],
	urlMessageId: string | null,
	activeThreadId: string | undefined
): string | null {
	if (urlMessageId) return urlMessageId;
	if (!activeThreadId) return null;
	return (
		messages.find((message) => message.threadId === activeThreadId)?.id ??
		mail.messages.find((message) => message.threadId === activeThreadId)?.id ??
		null
	);
}
