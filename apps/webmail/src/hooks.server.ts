import type { Handle, ServerInit } from '@sveltejs/kit';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { pushWatcher } from '$lib/server/push-watcher';

export const init: ServerInit = async () => {
	if (building) return;

	if (process.env.NODE_ENV === 'production') {
		const secret = env.SESSION_SECRET?.trim() ?? '';
		if (secret.length < 32) {
			throw new Error(
				'SESSION_SECRET must be set to a random string of at least 32 characters in production'
			);
		}
	}

	void pushWatcher.start();

	// adapter-node emits this after it stops accepting connections (SIGTERM/SIGINT).
	process.on('sveltekit:shutdown', () => {
		pushWatcher.stop();
	});
};

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// CSP is owned by kit.csp (svelte.config.js) so inline scripts get nonced.
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};
