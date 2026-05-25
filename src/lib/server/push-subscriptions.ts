import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type webpush from 'web-push';
import { env } from '$env/dynamic/private';

export interface StoredPushSubscription {
	id: string;
	username: string;
	sessionToken: string;
	subscription: webpush.PushSubscription;
	emailState?: string;
	inboxMailboxId?: string;
	createdAt: string;
	updatedAt: string;
}

type SubscriptionStore = Record<string, StoredPushSubscription>;

const DEFAULT_STORE_PATH = path.join(process.cwd(), '.data', 'push-subscriptions.json');

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
	await writeFile(storePath, JSON.stringify(store, null, 2), 'utf8');
}

export function subscriptionId(endpoint: string): string {
	return createHash('sha256').update(endpoint).digest('hex').slice(0, 32);
}

export async function listPushSubscriptions(): Promise<StoredPushSubscription[]> {
	const store = await readStore();
	return Object.values(store);
}

export async function getPushSubscription(id: string): Promise<StoredPushSubscription | null> {
	const store = await readStore();
	return store[id] ?? null;
}

export async function upsertPushSubscription(input: {
	username: string;
	sessionToken: string;
	subscription: webpush.PushSubscription;
}): Promise<StoredPushSubscription> {
	const store = await readStore();
	const id = subscriptionId(input.subscription.endpoint);
	const now = new Date().toISOString();
	const existing = store[id];

	const record: StoredPushSubscription = {
		id,
		username: input.username,
		sessionToken: input.sessionToken,
		subscription: input.subscription,
		emailState: existing?.emailState,
		inboxMailboxId: existing?.inboxMailboxId,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now
	};

	store[id] = record;
	await writeStore(store);
	return record;
}

export async function removePushSubscription(id: string): Promise<boolean> {
	const store = await readStore();
	if (!store[id]) return false;
	delete store[id];
	await writeStore(store);
	return true;
}

export async function removePushSubscriptionsForSession(sessionToken: string): Promise<number> {
	const store = await readStore();
	let removed = 0;

	for (const [id, record] of Object.entries(store)) {
		if (record.sessionToken === sessionToken) {
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
