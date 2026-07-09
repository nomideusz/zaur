import * as Sentry from '@sentry/sveltekit';
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { pushWatcher } from '$lib/server/push-watcher';
import { log } from '$lib/server/log';
import { getStoreDb, startStoreMaintenance } from '$lib/server/store-instance';
import { SESSION_RECORD_MAX_AGE_MS } from '$lib/server/session';

/*
 * Error tracking (Sentry-compatible; a Temps DSN works). Server events post
 * directly to the DSN host — no tunnel needed outside the browser. No-op when
 * the DSN is unset.
 */
const sentryDsn = env.SENTRY_DSN?.trim() || publicEnv.PUBLIC_SENTRY_DSN?.trim();
if (sentryDsn && !building) {
	Sentry.init({
		dsn: sentryDsn,
		environment:
			env.SENTRY_ENVIRONMENT?.trim() ||
			publicEnv.PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
			process.env.NODE_ENV ||
			'production',
		tracesSampleRate: 0,
		sendDefaultPii: false
	});
}

let stopStoreMaintenance: (() => void) | undefined;

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

	// Open the store eagerly so the one-time legacy sessions.json import runs at
	// boot (with a log line) instead of racing the first authenticated request.
	getStoreDb();
	stopStoreMaintenance = startStoreMaintenance(SESSION_RECORD_MAX_AGE_MS);

	void pushWatcher.start();

	// adapter-node emits this after it stops accepting connections (SIGTERM/SIGINT).
	process.on('sveltekit:shutdown', () => {
		pushWatcher.stop();
		stopStoreMaintenance?.();
	});
};

const securityAndLogging: Handle = async ({ event, resolve }) => {
	const started = Date.now();
	let response: Response;
	try {
		response = await resolve(event);
	} catch (error) {
		// Log the path only — query strings can carry search terms.
		log.error(
			'request_failed',
			{ method: event.request.method, path: event.url.pathname, ms: Date.now() - started },
			error
		);
		throw error;
	}

	if (event.url.pathname.startsWith('/api/')) {
		const entry = {
			method: event.request.method,
			path: event.url.pathname,
			status: response.status,
			ms: Date.now() - started
		};
		if (response.status >= 500) {
			log.error('api_request', entry);
		} else if (response.status >= 400) {
			log.warn('api_request', entry);
		} else {
			log.info('api_request', entry);
		}
	}

	// CSP is owned by kit.csp (svelte.config.js) so inline scripts get nonced.
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};

export const handle: Handle = sequence(Sentry.sentryHandle(), securityAndLogging);

const fallbackError: HandleServerError = ({ error, event }) => {
	log.error('unhandled_error', { method: event.request.method, path: event.url.pathname }, error);
	return { message: 'Internal error' };
};

export const handleError = Sentry.handleErrorWithSentry(fallbackError);
