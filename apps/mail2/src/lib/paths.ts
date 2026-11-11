/**
 * Paths mail served before it moved to mail.zaur.app, where Stalwart already
 * answers `/login`, `/api/…` and `/auth/…` (see README, "One host with
 * Stalwart"). Links, bookmarks, register and pages still open in a browser
 * keep using them on webmail.zaur.app, so they are still served: `reroute` in
 * hooks.ts maps each to its new route. Undefined = not an old path.
 */
const MOVED_API = /^\/api\/(download|events|internal\/handoff|jmap\/download|upload)$/;

export function movedPath(path: string): string | undefined {
	if (path === '/login' || path === '/login/passkey') return `/signin${path.slice('/login'.length)}`;
	if (path === '/api/auth/oauth/callback') return '/z/oauth/callback';
	if (MOVED_API.test(path)) return `/z${path.slice('/api'.length)}`;
	if (path === '/auth/claim' || path === '/auth/return') return `/z${path.slice('/auth'.length)}`;
	return undefined;
}
