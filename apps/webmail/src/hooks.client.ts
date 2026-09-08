import { init, captureException, DEFAULT_IGNORE_PATTERNS } from '@tracewayapp/frontend';
import { env } from '$env/dynamic/public';
import type { HandleClientError } from '@sveltejs/kit';

/*
 * Error tracking via self-hosted Traceway (traceway.zaur.app). DSN is
 * {token}@{url}/api/report; unset = disabled. The Traceway origin is in the CSP
 * connect-src (svelte.config.js), so no same-origin tunnel is needed.
 *
 * No session replay and no console mirroring, deliberately: either could ship
 * users' email contents to the error tracker.
 */
if (env.PUBLIC_TRACEWAY_DSN) {
	init(env.PUBLIC_TRACEWAY_DSN, {
		sessionRecording: false,
		captureLogs: false,
		ignoreErrors: [...DEFAULT_IGNORE_PATTERNS]
	});
}

export const handleError: HandleClientError = ({ error, status, message }) => {
	if (status === 404) return { message };
	captureException(error instanceof Error ? error : new Error(String(error)));
	return { message };
};
