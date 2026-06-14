import { browser } from '$app/environment';
import { addRxPlugin, createRxDatabase, removeRxDatabase, type RxCollection, type RxDatabase } from 'rxdb/plugins/core';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import {
	draftSchema,
	outboxSchema,
	recentThreadSchema,
	syncStateSchema,
	threadCacheSchema,
	attachmentBlobSchema
} from './schemas';
import type {
	DraftDoc,
	OutboxDoc,
	RecentThreadDoc,
	SyncStateDoc,
	ThreadCacheDoc,
	AttachmentBlobDoc
} from './types';

export type MailDatabase = RxDatabase & {
	drafts: RxCollection<DraftDoc>;
	outbox: RxCollection<OutboxDoc>;
	recentThreads: RxCollection<RecentThreadDoc>;
	syncState: RxCollection<SyncStateDoc>;
	threadCache: RxCollection<ThreadCacheDoc>;
	attachmentBlobs: RxCollection<AttachmentBlobDoc>;
};

const COLLECTIONS = {
	drafts: {
		schema: draftSchema,
		migrationStrategies: {
			1: (oldDoc: DraftDoc) => ({
				...oldDoc,
				bodyHtml: oldDoc.bodyHtml ?? ''
			})
		}
	},
	outbox: {
		schema: outboxSchema,
		migrationStrategies: {
			// v1 only adds optional fields (bodyHtml, format, jmapEmailId).
			1: (oldDoc: OutboxDoc) => oldDoc
		}
	},
	recentThreads: { schema: recentThreadSchema },
	syncState: { schema: syncStateSchema },
	threadCache: { schema: threadCacheSchema },
	attachmentBlobs: { schema: attachmentBlobSchema }
} as const;

let pluginsRegistered = false;

function ensureRxdbPlugins(): void {
	if (pluginsRegistered) return;
	addRxPlugin(RxDBMigrationSchemaPlugin);
	pluginsRegistered = true;
}

let db: MailDatabase | null = null;
let accountId: string | null = null;

function sanitizeAccountId(value: string): string {
	return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

async function ensureCollections(database: RxDatabase): Promise<MailDatabase> {
	const missing: Record<string, (typeof COLLECTIONS)[keyof typeof COLLECTIONS]> = {};

	for (const [name, definition] of Object.entries(COLLECTIONS)) {
		if (!database.collections[name]) {
			missing[name] = definition;
		}
	}

	if (Object.keys(missing).length) {
		await database.addCollections(missing);
	}

	return database as MailDatabase;
}

export function getAccountId(): string | null {
	return accountId;
}

export function getMailDatabase(): MailDatabase | null {
	return db;
}

export async function initMailDatabase(nextAccountId: string): Promise<MailDatabase | null> {
	if (!browser) return null;

	ensureRxdbPlugins();

	if (db && accountId === nextAccountId) {
		return db;
	}

	await closeMailDatabase();

	const name = `zaur-mail-${sanitizeAccountId(nextAccountId)}`;
	let database: RxDatabase | null = null;
	try {
		database = await createRxDatabase({
			name,
			storage: getRxStorageDexie(),
			multiInstance: true,
			eventReduce: true
		});

		db = await ensureCollections(database);
		accountId = nextAccountId;
		return db;
	} catch (err) {
		console.warn('Failed to initialize MailDatabase, attempting to clear and recreate:', err);

		if (database) {
			try {
				await database.close();
			} catch (closeErr) {
				console.error('Failed to close database instance:', closeErr);
			}
		}

		try {
			await removeRxDatabase(name, getRxStorageDexie());
		} catch (cleanupErr) {
			console.error('Failed to remove database during cleanup:', cleanupErr);
		}

		const cleanDatabase = await createRxDatabase({
			name,
			storage: getRxStorageDexie(),
			multiInstance: true,
			eventReduce: true
		});

		db = await ensureCollections(cleanDatabase);
		accountId = nextAccountId;
		return db;
	}
}

/** Close the open database, preserving its data on disk (used when switching accounts). */
export async function closeMailDatabase(): Promise<void> {
	if (!db) {
		accountId = null;
		return;
	}

	const current = db;
	db = null;
	accountId = null;
	await current.close();
}

/** Remove the open database, deleting its local data (used for sign-out and cache wipe). */
export async function removeMailDatabase(): Promise<void> {
	if (!db) {
		accountId = null;
		return;
	}

	const current = db;
	db = null;
	accountId = null;
	await current.remove();
}
