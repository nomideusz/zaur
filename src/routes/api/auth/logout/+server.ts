import { json, type RequestHandler } from '@sveltejs/kit';
import { removePushSubscriptionsForSession } from '$lib/server/push-subscriptions';
import { pushWatcher } from '$lib/server/push-watcher';
import { clearSession, COOKIE_NAME } from '$lib/server/session';

export const POST: RequestHandler = async ({ cookies }) => {
	const sessionToken = cookies.get(COOKIE_NAME);
	if (sessionToken) {
		await removePushSubscriptionsForSession(sessionToken);
		await pushWatcher.refresh();
	}

	clearSession(cookies);
	return json({ ok: true });
};
