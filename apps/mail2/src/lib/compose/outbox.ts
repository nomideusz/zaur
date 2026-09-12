import type { SendPayload } from './types';

const DB_NAME = 'zaur-mail2';
const DB_VERSION = 1;
const STORE = 'outbox';

export interface OutboxEntry {
	id: string;
	createdAt: number;
	attempts: number;
	lastError?: string;
	payload: SendPayload;
}

export function idbAvailable(): boolean {
	return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'));
	});
}

function withStore<T>(
	mode: IDBTransactionMode,
	run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
	return openDb().then(
		(db) =>
			new Promise<T>((resolve, reject) => {
				const tx = db.transaction(STORE, mode);
				const request = run(tx.objectStore(STORE));
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
				tx.oncomplete = () => db.close();
			})
	);
}

export async function enqueueOutbox(payload: SendPayload): Promise<void> {
	if (!idbAvailable()) throw new Error('No local database');
	const entry: OutboxEntry = {
		id: crypto.randomUUID(),
		createdAt: Date.now(),
		attempts: 0,
		payload
	};
	await withStore('readwrite', (store) => store.put(entry));
}

export async function listOutbox(): Promise<OutboxEntry[]> {
	if (!idbAvailable()) return [];
	const entries = await withStore('readonly', (store) => store.getAll() as IDBRequest<OutboxEntry[]>);
	return entries.sort((a, b) => a.createdAt - b.createdAt);
}

export async function updateOutboxEntry(entry: OutboxEntry): Promise<void> {
	if (!idbAvailable()) return;
	await withStore('readwrite', (store) => store.put(entry));
}

export async function removeOutboxEntry(id: string): Promise<void> {
	if (!idbAvailable()) return;
	await withStore('readwrite', (store) => store.delete(id));
}

export type FailureKind = 'network' | 'fatal';

/**
 * Only connectivity-shaped failures belong in the offline queue. A server
 * rejection ("Failed to send email", no Sent mailbox, …) must surface to
 * the user instead of retrying forever.
 */
export function classifySendFailure(cause: unknown): FailureKind {
	if (cause instanceof TypeError) return 'network';
	const message = cause instanceof Error ? cause.message : String(cause);
	if (
		/fetch failed|failed to fetch|networkerror|network error|socket|econn|timed? ?out|unreachable|bad gateway|service unavailable|gateway time-?out|\b5(02|03|04)\b/i.test(
			message
		)
	) {
		return 'network';
	}
	return 'fatal';
}
