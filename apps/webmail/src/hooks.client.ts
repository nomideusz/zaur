import * as Sentry from '@sentry/sveltekit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import type { HandleClientError } from '@sveltejs/kit';

/*
 * Error tracking (Sentry-compatible — points at a Temps DSN via PUBLIC_SENTRY_DSN).
 * Events go through the same-origin `/api/errors` tunnel so the strict CSP
 * (`connect-src 'self'`) holds and ad blockers can't eat crash reports.
 *
 * No session replay, deliberately: replaying a webmail session would ship
 * users' email contents to the error tracker.
 */
if (env.PUBLIC_SENTRY_DSN) {
	Sentry.init({
		dsn: env.PUBLIC_SENTRY_DSN,
		tunnel: '/api/errors',
		environment: env.PUBLIC_SENTRY_ENVIRONMENT || (dev ? 'development' : 'production'),
		tracesSampleRate: 0,
		sendDefaultPii: false
	});
}

const fallbackError: HandleClientError = ({ message }) => {
	return { message };
};

export const handleError = Sentry.handleErrorWithSentry(fallbackError);
