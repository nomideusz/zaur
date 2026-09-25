import type { SendPayload } from './types';
import type { LocalDraft } from './draft-save';

const DB_NAME = 'zaur-mail2';
const DB_VERSION = 2;
const STORE = 'outbox';
/** Drafts the server has not confirmed yet, see `localDraft`. */
const DRAFTS = 'drafts';

export interface OutboxEntry {
	id: string;
	createdAt: number;
	attempts: number;
	lastError?: string;
	payload: SendPayload;
	/** Inside its undo window until then: nothing sends it before. */
	holdUntil?: number;
	/** The saved draft it was written in, removed from Drafts once it has gone. */
	draftId?: string;
}

export function idbAvailable(): boolean {
	return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			for (const name of [STORE, DRAFTS]) {
				if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'));
	});
}

function withStore<T>(
	mode: IDBTransactionMode,
	run: (store: IDBObjectStore) => IDBRequest<T>,
	name = STORE
): Promise<T> {
	return openDb().then(
		(db) =>
			new Promise<T>((resolve, reject) => {
				const tx = db.transaction(name, mode);
				const request = run(tx.objectStore(name));
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
				tx.oncomplete = () => db.close();
			})
	);
}

export async function enqueueOutbox(
	payload: SendPayload,
	extra: Pick<OutboxEntry, 'holdUntil' | 'draftId'> = {}
): Promise<string> {
	if (!idbAvailable()) throw new Error('No local database');
	const entry: OutboxEntry = {
		id: crypto.randomUUID(),
		createdAt: Date.now(),
		attempts: 0,
		payload,
		...extra
	};
	await withStore('readwrite', (store) => store.put(entry));
	return entry.id;
}

/**
 * Everything that sends from, or takes back from, the outbox runs under one
 * lock across this browser's tabs, and re-reads the entry inside it: so one
 * message is sent once, and an Undo either wins or finds it already gone.
 */
export function withOutboxLock<T>(run: () => Promise<T>): Promise<T> {
	if (typeof navigator === 'undefined' || !navigator.locks) return run();
	return navigator.locks.request('zaur-mail2-outbox', run);
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

export async function putLocalDraft(record: LocalDraft): Promise<void> {
	if (!idbAvailable()) return;
	await withStore('readwrite', (store) => store.put(record), DRAFTS);
}

export async function listLocalDrafts(): Promise<LocalDraft[]> {
	if (!idbAvailable()) return [];
	return withStore('readonly', (store) => store.getAll() as IDBRequest<LocalDraft[]>, DRAFTS);
}

export async function removeLocalDraft(id: string): Promise<void> {
	if (!idbAvailable()) return;
	await withStore('readwrite', (store) => store.delete(id), DRAFTS);
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
