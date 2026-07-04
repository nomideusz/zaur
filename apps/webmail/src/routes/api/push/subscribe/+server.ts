import { error, json, type RequestHandler } from '@sveltejs/kit';
import { isPushConfigured } from '$lib/server/push-config';
import { upsertPushSubscription } from '$lib/server/push-subscriptions';
import { pushWatcher } from '$lib/server/push-watcher';
import { readSession, COOKIE_NAME } from '$lib/server/session';

// The push-watcher POSTs to this endpoint server-side, so an unvalidated URL is
// blind SSRF into the internal network. Only real push services are allowed.
const ALLOWED_PUSH_HOSTS = [
	'fcm.googleapis.com', // Chrome/Edge (FCM)
	'push.services.mozilla.com', // Firefox (updates.push.services.mozilla.com)
	'notify.windows.com', // Windows/legacy Edge (*.notify.windows.com)
	'push.apple.com' // Safari (web.push.apple.com)
];

function isAllowedPushEndpoint(endpoint: string): boolean {
	let url: URL;
	try {
		url = new URL(endpoint);
	} catch {
		return false;
	}
	if (url.protocol !== 'https:') return false;
	const host = url.hostname.toLowerCase();
	return ALLOWED_PUSH_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!isPushConfigured()) {
		error(503, 'Push notifications are not configured');
	}

	const sessionId = cookies.get(COOKIE_NAME);
	const session = readSession(cookies);
	if (!session || !sessionId) {
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

	if (!isAllowedPushEndpoint(subscription.endpoint)) {
		error(400, 'Unsupported push endpoint');
	}

	const record = await upsertPushSubscription({
		username: session.username,
		sessionId,
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
