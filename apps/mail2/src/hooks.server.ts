import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { building, dev } from '$app/env';
import { SESSION_RECORD_MAX_AGE_MS, startStoreMaintenance } from '@zaur/server-auth';
import { legacyRedirect } from '#lib/legacy-links';
import { pushWatcher } from '#lib/server/push-watcher';
import { reportError } from '#lib/server/report';

// New-mail notifications for every subscribed browser (no-op without VAPID keys),
// and the hourly prune of expired sessions and lapsed rate-limit windows.
export const init: ServerInit = () => {
	if (building) return;
	pushWatcher.start();
	const stopStoreMaintenance = startStoreMaintenance(SESSION_RECORD_MAX_AGE_MS);
	process.on('sveltekit:shutdown', () => {
		pushWatcher.stop();
		stopStoreMaintenance();
	});
};

// Camera and microphone stay off everywhere but a call.
const LOCKED = 'camera=(), microphone=(), geolocation=()';
const MEET = 'camera=(self), microphone=(self), display-capture=(self), geolocation=()';

/*
 * Kit's cross-site form check, which `csrf.trustedOrigins: ['*']` in
 * vite.config.ts switches off so that /oidc/token can be let through: relying
 * parties POST their forms there server to server, with no Origin, and prove
 * who they are with the client secret, not a cookie. Otherwise the same rule
 * as Kit's (which also skips it in dev). Remote functions keep Kit's own check.
 */
const FORM_TYPES = new Set(['', 'application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain']);
function crossSiteForm({ request, url }: Parameters<Handle>[0]['event']): boolean {
	if (dev || url.pathname === '/oidc/token' || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
		return false;
	}
	const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
	return FORM_TYPES.has(type) && request.headers.get('origin') !== url.origin;
}

// Uptime probe (liveness only: the process is serving requests), webmail 1.0's
// URLs, then the headers CSP does not cover. CSP itself is `csp` in vite.config.ts.
// The 1.0 redirects are 302s so that pointing the domain back at webmail undoes them.
export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/health') {
		return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
	}
	const legacy = event.request.method === 'GET' ? legacyRedirect(event.url, process.env.PUBLIC_REGISTER_URL?.trim()) : null;
	if (legacy) return new Response(null, { status: 302, headers: { location: legacy } });
	if (crossSiteForm(event)) {
		return new Response(`Cross-site ${event.request.method} form submissions are forbidden`, { status: 403 });
	}
	const response = await resolve(event);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', event.url.pathname.startsWith('/meet/') ? MEET : LOCKED);
	return response;
};

// Kit's default logging, plus Traceway for the errors that are bugs. `error(401)`
// and friends, 404s and bad remote-function arguments are not failures.
export const handleError: HandleServerError = ({ kind, error, issues, event }) => {
	if (kind === 'validation') console.error('Remote function schema validation failed:', issues);
	if (kind !== 'unknown') return;
	console.error(error);
	reportError(error, { method: event.request.method, url: event.url.pathname });
};
