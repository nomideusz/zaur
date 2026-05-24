import type { MessageDetail } from '$lib/types/mail';
import { getMailDatabase } from './database';

const MAX_CACHED_THREADS = 30;

function docId(accountId: string, threadId: string): string {
	return `${accountId}:${threadId}`;
}

export async function cacheThread(
	accountId: string,
	mailboxRouteId: string,
	threadId: string,
	messages: MessageDetail[]
): Promise<void> {
	const db = getMailDatabase();
	if (!db?.threadCache || !messages.length) return;

	const cachedAt = Date.now();
	await db.threadCache.upsert({
		id: docId(accountId, threadId),
		accountId,
		threadId,
		mailboxRouteId,
		messagesJson: JSON.stringify(messages),
		cachedAt
	});

	const overflow = await db.threadCache
		.find({
			selector: { accountId },
			sort: [{ cachedAt: 'asc' }],
			skip: MAX_CACHED_THREADS
		})
		.exec();

	if (overflow.length) {
		await db.threadCache.bulkRemove(overflow.map((doc) => doc.primary));
	}
}

export async function getCachedThread(accountId: string, threadId: string): Promise<MessageDetail[] | null> {
	const db = getMailDatabase();
	if (!db?.threadCache) return null;

	const doc = await db.threadCache.findOne({ selector: { id: docId(accountId, threadId) } }).exec();
	if (!doc) return null;

	try {
		return JSON.parse(doc.messagesJson) as MessageDetail[];
	} catch {
		return null;
	}
}
