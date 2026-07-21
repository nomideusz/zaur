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
		important: message.important,
		hasAttachment: message.hasAttachment,
		replied: message.replied,
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
		important: doc.important ?? false,
		hasAttachment: doc.hasAttachment,
		replied: doc.replied
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

/**
 * Substring search over the cached previews (sender, subject, preview text).
 * Complements server search: Stalwart's FTS only matches whole tokens, so
 * "rail" won't find "Railway" server-side — locally it does.
 */
export async function searchCachedMessagePreviews(
	accountId: string,
	terms: string[],
	options?: { mailboxRouteId?: string; limit?: number }
): Promise<MessagePreview[]> {
	const db = getMailDatabase();
	if (!db || !terms.length) return [];

	const selector: Record<string, string> = { accountId };
	if (options?.mailboxRouteId) selector.mailboxRouteId = options.mailboxRouteId;
	const docs = await db.recentThreads.find({ selector }).exec();

	const needles = terms.map((term) => term.toLowerCase());
	return docs
		.map((doc) => doc.toJSON() as RecentThreadDoc)
		.filter((doc) => {
			const haystack =
				`${doc.fromName} ${doc.fromEmail} ${doc.subject} ${doc.preview}`.toLowerCase();
			return needles.every((needle) => haystack.includes(needle));
		})
		.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1))
		.slice(0, options?.limit ?? 50)
		.map(toPreview);
}

export async function patchCachedMessage(
	accountId: string,
	emailId: string,
	patch: Partial<Pick<MessagePreview, 'unread' | 'starred' | 'important'>>
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
