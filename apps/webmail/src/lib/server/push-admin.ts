import { timingSafeEqual } from 'node:crypto';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { isPushConfigured } from '$lib/server/push-config';
import { sendPushNotification, type PushMessage } from '$lib/server/push-sender';
import { listPushSubscriptions, type StoredPushSubscription } from '$lib/server/push-subscriptions';

export interface PushSubscriptionSummary {
	id: string;
	username: string;
	pushService: string;
	endpointPreview: string;
	createdAt: string;
	updatedAt: string;
	hasEmailState: boolean;
	inboxMailboxId: string | null;
}

export interface PushTestResult {
	id: string;
	username: string;
	ok: boolean;
	error?: string;
}

function getAdminToken(): string | undefined {
	return env.PUSH_ADMIN_TOKEN?.trim() || undefined;
}

export function isPushAdminEnabled(): boolean {
	return Boolean(getAdminToken());
}

function getBearerToken(request: Request): string | undefined {
	const header = request.headers.get('authorization')?.trim();
	if (!header?.toLowerCase().startsWith('bearer ')) return undefined;
	const token = header.slice(7).trim();
	return token || undefined;
}

function tokensMatch(provided: string, expected: string): boolean {
	const providedBuf = Buffer.from(provided);
	const expectedBuf = Buffer.from(expected);
	if (providedBuf.length !== expectedBuf.length) return false;
	return timingSafeEqual(providedBuf, expectedBuf);
}

export function assertPushAdmin(request: Request): void {
	const expected = getAdminToken();
	if (!expected) error(404, 'Not found');

	const provided = getBearerToken(request);
	if (!provided || !tokensMatch(provided, expected)) {
		error(401, 'Unauthorized');
	}
}

export function summarizePushSubscription(record: StoredPushSubscription): PushSubscriptionSummary {
	const endpoint = record.subscription.endpoint;
	let pushService = 'unknown';

	try {
		pushService = new URL(endpoint).host;
	} catch {
		// ignore malformed endpoints in summary output
	}

	const previewLength = 72;
	const endpointPreview =
		endpoint.length <= previewLength ? endpoint : `${endpoint.slice(0, previewLength)}…`;

	return {
		id: record.id,
		username: record.username,
		pushService,
		endpointPreview,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		hasEmailState: Boolean(record.emailState),
		inboxMailboxId: record.inboxMailboxId ?? null
	};
}

export async function getPushAdminStatus() {
	const records = await listPushSubscriptions();

	return {
		configured: isPushConfigured(),
		adminEnabled: isPushAdminEnabled(),
		count: records.length,
		subscriptions: records.map(summarizePushSubscription)
	};
}

export async function sendTestPushNotifications(input?: {
	id?: string;
	title?: string;
	body?: string;
}): Promise<{ sent: number; failed: number; results: PushTestResult[] }> {
	if (!isPushConfigured()) {
		error(503, 'Push notifications are not configured');
	}

	const records = await listPushSubscriptions();
	const targets = input?.id ? records.filter((record) => record.id === input.id) : records;

	if (input?.id && !targets.length) {
		error(404, 'Push subscription not found');
	}

	const message: PushMessage = {
		title: input?.title?.trim() || 'ZAUR push test',
		body: input?.body?.trim() || 'If you see this, push delivery is working.',
		url: '/',
		tag: 'zaur-push-test'
	};

	const results: PushTestResult[] = [];

	for (const record of targets) {
		const ok = await sendPushNotification(record, message);
		results.push({
			id: record.id,
			username: record.username,
			ok,
			error: ok ? undefined : 'Delivery failed'
		});
	}

	return {
		sent: results.filter((result) => result.ok).length,
		failed: results.filter((result) => !result.ok).length,
		results
	};
}
