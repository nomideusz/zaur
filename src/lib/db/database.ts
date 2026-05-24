import { browser } from '$app/environment';
import { createRxDatabase, type RxCollection, type RxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { draftSchema, outboxSchema, recentThreadSchema, syncStateSchema } from './schemas';
import type { DraftDoc, OutboxDoc, RecentThreadDoc, SyncStateDoc } from './types';

export type MailDatabase = RxDatabase & {
	drafts: RxCollection<DraftDoc>;
	outbox: RxCollection<OutboxDoc>;
	recentThreads: RxCollection<RecentThreadDoc>;
	syncState: RxCollection<SyncStateDoc>;
};

let db: MailDatabase | null = null;
let accountId: string | null = null;

function sanitizeAccountId(value: string): string {
	return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

export function getAccountId(): string | null {
	return accountId;
}

export function getMailDatabase(): MailDatabase | null {
	return db;
}

export async function initMailDatabase(nextAccountId: string): Promise<MailDatabase | null> {
	if (!browser) return null;

	if (db && accountId === nextAccountId) {
		return db;
	}

	await closeMailDatabase();

	const name = `zaur-mail-${sanitizeAccountId(nextAccountId)}`;
	const database = await createRxDatabase({
		name,
		storage: getRxStorageDexie(),
		multiInstance: false,
		eventReduce: true
	});

	await database.addCollections({
		drafts: { schema: draftSchema },
		outbox: { schema: outboxSchema },
		recentThreads: { schema: recentThreadSchema },
		syncState: { schema: syncStateSchema }
	});

	db = database as MailDatabase;
	accountId = nextAccountId;
	return db;
}

export async function closeMailDatabase(): Promise<void> {
	if (!db) {
		accountId = null;
		return;
	}

	const current = db;
	db = null;
	accountId = null;
	await current.remove();
}
