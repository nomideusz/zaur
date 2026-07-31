import { error, json, type RequestHandler } from '@sveltejs/kit';
import {
	getPushSubscription,
	setPushSubscriptionMutedAccounts,
	subscriptionId
} from '$lib/server/push-subscriptions';
import { pushWatcher } from '$lib/server/push-watcher';
import { accountKey, readAccountsById, readSession } from '$lib/server/session';

/** Per-device notification preferences (which accounts are muted). */

function recordId(endpoint?: string | null, fcmToken?: string | null): string | null {
	const token = fcmToken?.trim();
	if (token) return subscriptionId(`fcm:${token}`);
	const trimmed = endpoint?.trim();
	if (trimmed) return subscriptionId(trimmed);
	return null;
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	const session = readSession(cookies);
	if (!session) {
		error(401, 'Unauthorized');
	}

	const id = recordId(url.searchParams.get('endpoint'), url.searchParams.get('fcmToken'));
	if (!id) {
		error(400, 'Missing subscription endpoint');
	}

	const record = await getPushSubscription(id);
	if (!record || record.sessionId !== session.id) {
		return json({ mutedAccounts: [] });
	}
	return json({ mutedAccounts: record.mutedAccounts ?? [] });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const session = readSession(cookies);
	if (!session) {
		error(401, 'Unauthorized');
	}

	let body: { endpoint?: string; fcmToken?: string; mutedAccounts?: unknown };
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid request body');
	}

	const id = recordId(body.endpoint, body.fcmToken);
	if (!id) {
		error(400, 'Missing subscription endpoint');
	}
	const rawMuted = body.mutedAccounts;
	if (!Array.isArray(rawMuted) || !rawMuted.every((key) => typeof key === 'string')) {
		error(400, 'Invalid mutedAccounts');
	}

	const record = await getPushSubscription(id);
	if (!record) {
		error(404, 'Unknown subscription');
	}
	if (record.sessionId !== session.id) {
		error(403, 'Forbidden');
	}

	// Only keys of accounts actually signed into this session are meaningful.
	const validKeys = new Set(
		readAccountsById(session.id).map((account) => accountKey(account.username))
	);
	const mutedAccounts = [...new Set(rawMuted)].filter((key) => validKeys.has(key));

	await setPushSubscriptionMutedAccounts(id, mutedAccounts);
	await pushWatcher.refresh();

	return json({ ok: true, mutedAccounts });
};
