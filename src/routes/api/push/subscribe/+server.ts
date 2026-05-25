import { error, json, type RequestHandler } from '@sveltejs/kit';
import { isPushConfigured } from '$lib/server/push-config';
import { upsertPushSubscription } from '$lib/server/push-subscriptions';
import { pushWatcher } from '$lib/server/push-watcher';
import { readSession, COOKIE_NAME } from '$lib/server/session';

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!isPushConfigured()) {
		error(503, 'Push notifications are not configured');
	}

	const sessionToken = cookies.get(COOKIE_NAME);
	const session = readSession(cookies);
	if (!session || !sessionToken) {
		error(401, 'Unauthorized');
	}

	let body: { subscription?: PushSubscriptionJSON };
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid request body');
	}

	const subscription = body.subscription;
	if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
		error(400, 'Invalid push subscription');
	}

	const record = await upsertPushSubscription({
		username: session.username,
		sessionToken,
		subscription: {
			endpoint: subscription.endpoint,
			expirationTime: subscription.expirationTime ?? null,
			keys: {
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth
			}
		}
	});

	await pushWatcher.refresh();

	return json({ ok: true, id: record.id });
};
