import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { pushWatcher } from '$lib/server/push-watcher';

let pushWatcherStarted = false;

export const handle: Handle = async ({ event, resolve }) => {
	if (!pushWatcherStarted) {
		pushWatcherStarted = true;
		void pushWatcher.start();
	}

	const response = await resolve(event);

	const authOrigin = env.OAUTH_ISSUER_URL?.trim().replace(/\/$/, '') ?? '';
	const connectSrc = ["'self'", 'https://mail.zaur.app', authOrigin].filter(Boolean).join(' ');

	const csp = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline'",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob: https: http:",
		"font-src 'self'",
		`connect-src ${connectSrc}`,
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"object-src 'none'"
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};
