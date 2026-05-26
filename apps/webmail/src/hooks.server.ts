import type { Handle } from '@sveltejs/kit';
import { pushWatcher } from '$lib/server/push-watcher';

let pushWatcherStarted = false;

export const handle: Handle = async ({ event, resolve }) => {
	if (!pushWatcherStarted) {
		pushWatcherStarted = true;
		void pushWatcher.start();
	}

	const response = await resolve(event);

	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};
