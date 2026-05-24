import type { MessagePreview } from '$lib/types/mail';
import { getMailDatabase } from './database';
import type { RecentThreadDoc } from './types';

const MAX_CACHED_PER_MAILBOX = 200;

function docId(accountId: string, emailId: string): string {
	return `${accountId}:${emailId}`;
}

function toDoc(accountId: string, message: MessagePreview, cachedAt: number): RecentThreadDoc {
	return {
		id: docId(accountId, message.id),
		accountId,
		mailboxRouteId: message.mailboxId,
		threadId: message.threadId,
		emailId: message.id,
		fromName: message.from.name,
		fromEmail: message.from.email,
		subject: message.subject,
		preview: message.preview,
		receivedAt: message.receivedAt,
		unread: message.unread,
		starred: message.starred,
		hasAttachment: message.hasAttachment,
		cachedAt
	};
}

function toPreview(doc: RecentThreadDoc): MessagePreview {
	return {
		id: doc.emailId,
		threadId: doc.threadId,
		mailboxId: doc.mailboxRouteId,
		from: { name: doc.fromName, email: doc.fromEmail },
		subject: doc.subject,
		preview: doc.preview,
		receivedAt: doc.receivedAt,
		unread: doc.unread,
		starred: doc.starred,
		hasAttachment: doc.hasAttachment
	};
}

export async function cacheMessagePreviews(
	accountId: string,
	mailboxRouteId: string,
	messages: MessagePreview[]
): Promise<void> {
	const db = getMailDatabase();
	if (!db || !messages.length) return;

	const cachedAt = Date.now();
	await db.recentThreads.bulkUpsert(messages.map((message) => toDoc(accountId, message, cachedAt)));

	const overflow = await db.recentThreads
		.find({
			selector: { accountId, mailboxRouteId },
			sort: [{ receivedAt: 'desc' }],
			skip: MAX_CACHED_PER_MAILBOX
		})
		.exec();

	if (overflow.length) {
		await db.recentThreads.bulkRemove(overflow.map((doc) => doc.primary));
	}
}

export async function getCachedMessagePreviews(
	accountId: string,
	mailboxRouteId: string,
	limit = 50
): Promise<MessagePreview[]> {
	const db = getMailDatabase();
	if (!db) return [];

	const docs = await db.recentThreads
		.find({
			selector: { accountId, mailboxRouteId },
			sort: [{ receivedAt: 'desc' }],
			limit
		})
		.exec();

	return docs.map((doc) => toPreview(doc.toJSON()));
}

export async function patchCachedMessage(
	accountId: string,
	emailId: string,
	patch: Partial<Pick<MessagePreview, 'unread' | 'starred'>>
): Promise<void> {
	const db = getMailDatabase();
	if (!db) return;

	const doc = await db.recentThreads.findOne({ selector: { id: docId(accountId, emailId) } }).exec();
	if (!doc) return;

	await doc.patch({
		...patch,
		cachedAt: Date.now()
	});
}

export async function removeCachedMessage(accountId: string, emailId: string): Promise<void> {
	const db = getMailDatabase();
	if (!db) return;

	const doc = await db.recentThreads.findOne({ selector: { id: docId(accountId, emailId) } }).exec();
	if (doc) await doc.remove();
}
