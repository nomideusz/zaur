import { mail } from '$lib/stores/mail.svelte';
import { mailThreadHref } from '$lib/mail/routes';
import type { MessageDetail, MessagePreview } from '$lib/types/mail';

export {
	collapseMessagesByThread,
	indexMessagesByThreadId,
	listThreadSenderLabel
} from './thread-list-utils.ts';

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
			return 'No spam';
		case 'important':
			return 'Nothing marked important';
		case 'scheduled':
			return 'Nothing scheduled';
		case 'memos':
			return 'No memos yet';
		case 'snoozed':
			return 'Nothing snoozed';
		default:
			return 'Nothing here yet';
	}
}


export function defaultEmptyHint(mailboxRouteId: string | undefined): string | null {
	switch (mailboxRouteId) {
		case 'inbox':
			return 'Unseen messages will appear here as soon as they arrive.';
		case 'drafts':
			return 'Start a message and it will be saved here automatically.';
		case 'sent':
			return 'Messages you send will be collected here for easy reference.';
		default:
			return null;
	}
}

export function messageHref(
	message: MessagePreview,
	searchReturnTo: string | null
): string {
	const searchParams = new URLSearchParams();
	searchParams.set('messageId', message.id);
	if (searchReturnTo) {
		searchParams.set('returnTo', searchReturnTo);
	}
	return mailThreadHref(message.mailboxId, message.threadId, searchParams);
}

/** Message targeted by list/reader actions (keywords, move, delete) — not always the chronologically latest. */
export function threadActionMessage(
	thread: MessageDetail[],
	urlMessageId: string | null,
	folderMessages: MessagePreview[]
): MessageDetail | undefined {
	if (!thread.length) return undefined;

	if (urlMessageId) {
		const focused = thread.find((message) => message.id === urlMessageId);
		if (focused) return focused;
	}

	const inFolder = thread.filter((message) =>
		folderMessages.some((listMessage) => listMessage.id === message.id)
	);
	if (inFolder.length) return inFolder.at(-1);

	return thread.at(-1);
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
