import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type webpush from 'web-push';
import { env } from '$env/dynamic/private';
import { REMEMBERED_SESSION_MAX_AGE_SEC } from '$lib/server/session';

export interface StoredPushSubscription {
	id: string;
	username: string;
	sessionId: string;
	/** Absent means 'webpush' (legacy records predate the field). */
	platform?: 'webpush' | 'fcm';
	subscription?: webpush.PushSubscription;
	fcmToken?: string;
	emailState?: string;
	inboxMailboxId?: string;
	createdAt: string;
	updatedAt: string;
}

type SubscriptionStore = Record<string, StoredPushSubscription>;

const DEFAULT_STORE_PATH = path.join(process.cwd(), '.data', 'push-subscriptions.json');
const MAX_RECORD_AGE_MS = REMEMBERED_SESSION_MAX_AGE_SEC * 1000;

function getStorePath(): string {
	return env.PUSH_SUBSCRIPTIONS_PATH?.trim() || DEFAULT_STORE_PATH;
}

async function readStore(): Promise<SubscriptionStore> {
	try {
		const raw = await readFile(getStorePath(), 'utf8');
		const parsed = JSON.parse(raw) as SubscriptionStore;
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

async function writeStore(store: SubscriptionStore): Promise<void> {
	const storePath = getStorePath();
	await mkdir(path.dirname(storePath), { recursive: true });
	// Write-then-rename so a crash or concurrent reader never sees a truncated file.
	const tmpPath = `${storePath}.${randomBytes(6).toString('hex')}.tmp`;
	await writeFile(tmpPath, JSON.stringify(store, null, 2), 'utf8');
	await rename(tmpPath, storePath);
}

export function subscriptionId(endpoint: string): string {
	return createHash('sha256').update(endpoint).digest('hex').slice(0, 32);
}

export async function listPushSubscriptions(): Promise<StoredPushSubscription[]> {
	const store = await readStore();
	const now = Date.now();
	let pruned = false;

	for (const [id, record] of Object.entries(store)) {
		if (isExpired(record, now)) {
			delete store[id];
			pruned = true;
		}
	}

	if (pruned) await writeStore(store);
	return Object.values(store);
}

export async function getPushSubscription(id: string): Promise<StoredPushSubscription | null> {
	const store = await readStore();
	const record = store[id];
	if (!record) return null;
	if (isExpired(record)) {
		delete store[id];
		await writeStore(store);
		return null;
	}
	return record;
}

export async function upsertPushSubscription(input: {
	username: string;
	sessionId: string;
	subscription?: webpush.PushSubscription;
	fcmToken?: string;
}): Promise<StoredPushSubscription> {
	const store = await readStore();
	// `fcm:` prefix keeps token-derived ids from ever colliding with endpoint ids.
	const id = input.fcmToken
		? subscriptionId(`fcm:${input.fcmToken}`)
		: subscriptionId(input.subscription!.endpoint);
	const now = new Date().toISOString();
	const existing = store[id];

	const record: StoredPushSubscription = {
		id,
		username: input.username,
		sessionId: input.sessionId,
		platform: input.fcmToken ? 'fcm' : 'webpush',
		subscription: input.subscription,
		fcmToken: input.fcmToken,
		emailState: existing?.emailState,
		inboxMailboxId: existing?.inboxMailboxId,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now
	};

	store[id] = record;
	await writeStore(store);
	return record;
}

function isExpired(record: StoredPushSubscription, now = Date.now()): boolean {
	const timestamp = Date.parse(record.updatedAt || record.createdAt);
	if (!Number.isFinite(timestamp)) return true;
	return now - timestamp > MAX_RECORD_AGE_MS;
}

export async function removePushSubscription(id: string): Promise<boolean> {
	const store = await readStore();
	if (!store[id]) return false;
	delete store[id];
	await writeStore(store);
	return true;
}

export async function removePushSubscriptionsForSession(sessionId: string): Promise<number> {
	const store = await readStore();
	let removed = 0;

	for (const [id, record] of Object.entries(store)) {
		if (record.sessionId === sessionId) {
			delete store[id];
			removed += 1;
		}
	}

	if (removed) await writeStore(store);
	return removed;
}

export async function updatePushSubscriptionState(
	id: string,
	patch: Pick<StoredPushSubscription, 'emailState' | 'inboxMailboxId'>
): Promise<void> {
	const store = await readStore();
	const record = store[id];
	if (!record) return;

	store[id] = {
		...record,
		...patch,
		updatedAt: new Date().toISOString()
	};
	await writeStore(store);
}
