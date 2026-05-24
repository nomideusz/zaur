import { getMailDatabase } from './database';
import type { SyncStateType } from './types';

function syncStateId(accountId: string, type: SyncStateType): string {
	return `${accountId}:${type}`;
}

export async function getSyncState(accountId: string, type: SyncStateType): Promise<string | null> {
	const db = getMailDatabase();
	if (!db) return null;

	const doc = await db.syncState.findOne({ selector: { id: syncStateId(accountId, type) } }).exec();
	return doc?.state ?? null;
}

export async function setSyncState(
	accountId: string,
	type: SyncStateType,
	state: string
): Promise<void> {
	const db = getMailDatabase();
	if (!db) return;

	await db.syncState.upsert({
		id: syncStateId(accountId, type),
		accountId,
		type,
		state,
		updatedAt: Date.now()
	});
}

export async function getAllSyncStates(
	accountId: string
): Promise<Partial<Record<SyncStateType, string>>> {
	const db = getMailDatabase();
	if (!db) return {};

	const docs = await db.syncState.find({ selector: { accountId } }).exec();
	const result: Partial<Record<SyncStateType, string>> = {};

	for (const doc of docs) {
		const type = doc.type as SyncStateType;
		result[type] = doc.state;
	}

	return result;
}
