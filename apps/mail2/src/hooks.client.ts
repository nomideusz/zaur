import { init, captureException, DEFAULT_IGNORE_PATTERNS } from '@tracewayapp/frontend';
import { PUBLIC_TRACEWAY_DSN } from '$app/env/public';
import type { HandleClientError } from '@sveltejs/kit/hooks';

/*
 * Error tracking via self-hosted Traceway (traceway.zaur.app), as in webmail 1.0.
 * DSN is {token}@{url}/api/report; unset = disabled. mail2 sends no CSP today —
 * if it gets one, connect-src needs https://traceway.zaur.app.
 *
 * No session replay and no console mirroring, deliberately: either could ship
 * someone's mail to the error tracker.
 */
if (PUBLIC_TRACEWAY_DSN) {
	init(PUBLIC_TRACEWAY_DSN, {
		sessionRecording: false,
		captureLogs: false,
		ignoreErrors: [...DEFAULT_IGNORE_PATTERNS]
	});
}

export const handleError: HandleClientError = ({ kind, error }) => {
	if (kind !== 'unknown') return;
	console.error(error);
	captureException(error instanceof Error ? error : new Error(String(error)));
};
