import type { MessagePreview } from '../types/mail';

export type SenderLabel = { label: string; email: string };

function previewSenderLabel(
	message: MessagePreview,
	folderRouteId: string,
	isMe: (email: string) => boolean,
	showSenderEmailInList: boolean
): SenderLabel {
	if (
		isMe(message.from.email) &&
		folderRouteId !== 'inbox' &&
		message.to &&
		message.to.length > 0
	) {
		const recipient = message.to[0];
		const email = recipient.email?.trim() ?? '';
		return { label: `To ${recipient.name?.trim() || email}`, email };
	}
	const email = message.from.email?.trim() ?? '';
	const name = message.from.name?.trim();
	if (name) return { label: name, email };
	if (showSenderEmailInList) return { label: email || 'Unknown', email };
	return { label: email ? (email.split('@')[0] ?? email) : 'Unknown', email };
}

/** One list row per thread — latest message wins; flags merge across the thread. */
export function collapseMessagesByThread(messages: MessagePreview[]): MessagePreview[] {
	const byThread = indexMessagesByThreadId(messages);

	const collapsed: MessagePreview[] = [];
	for (const group of byThread.values()) {
		const rep = group.reduce((latest, message) =>
			new Date(message.receivedAt).getTime() > new Date(latest.receivedAt).getTime()
				? message
				: latest
		);
		collapsed.push({
			...rep,
			unread: group.some((message) => message.unread),
			important: group.some((message) => message.important),
			starred: group.some((message) => message.starred),
			hasAttachment: group.some((message) => message.hasAttachment),
			replied: group.some((message) => message.replied)
		});
	}

	return collapsed.sort(
		(a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
	);
}

/** Stable counterparty label for a thread row (handles "latest is my reply" on inbox). */
export function listThreadSenderLabel(
	threadMessages: MessagePreview[],
	folderRouteId: string,
	isMe: (email: string) => boolean,
	showSenderEmailInList: boolean
): SenderLabel {
	if (!threadMessages.length) return { label: 'Unknown', email: '' };

	const sorted = [...threadMessages].sort(
		(a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
	);
	const latest = sorted[0]!;

	if (folderRouteId === 'inbox' && isMe(latest.from.email)) {
		const recipient = latest.to?.[0];
		if (recipient) {
			const email = recipient.email?.trim() ?? '';
			const name = recipient.name?.trim();
			if (name) return { label: name, email };
			if (email) {
				return { label: showSenderEmailInList ? email : (email.split('@')[0] ?? email), email };
			}
		}
		const counterparty = sorted.find((message) => !isMe(message.from.email));
		if (counterparty) {
			return previewSenderLabel(counterparty, folderRouteId, isMe, showSenderEmailInList);
		}
	}

	return previewSenderLabel(latest, folderRouteId, isMe, showSenderEmailInList);
}

export function indexMessagesByThreadId(
	messages: MessagePreview[]
): Map<string, MessagePreview[]> {
	const byThread = new Map<string, MessagePreview[]>();
	for (const message of messages) {
		const group = byThread.get(message.threadId) ?? [];
		group.push(message);
		byThread.set(message.threadId, group);
	}
	return byThread;
}
