import { error, json, type RequestHandler } from '@sveltejs/kit';
import { getPushSubscription, removePushSubscription, subscriptionId } from '$lib/server/push-subscriptions';
import { pushWatcher } from '$lib/server/push-watcher';
import { readSession } from '$lib/server/session';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const session = readSession(cookies);
	if (!session) {
		error(401, 'Unauthorized');
	}

	let body: { endpoint?: string };
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid request body');
	}

	const endpoint = body.endpoint?.trim();
	if (!endpoint) {
		error(400, 'Missing subscription endpoint');
	}

	const id = subscriptionId(endpoint);
	const record = await getPushSubscription(id);
	if (record && record.username !== session.username) {
		error(403, 'Forbidden');
	}

	await removePushSubscription(id);
	await pushWatcher.refresh();

	return json({ ok: true });
};
