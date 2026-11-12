/**
 * Which host serves what, once mail answers on more than one.
 *
 * CANONICAL_ORIGIN (e.g. https://mail.zaur.app) is where people use mail: page
 * loads on any other host are sent there, so old links keep working.
 * OIDC_ISSUER (e.g. https://webmail.zaur.app) is where our other apps sign in:
 * the issuer is part of every token they hold and of the discovery URL they are
 * configured with, so it stays put, and /oidc/* on any other host is sent there.
 * Both unset (dev, the demo): every host is both, as before.
 *
 * The session cookie spans both hosts (SESSION_COOKIE_DOMAIN=.zaur.app), so a
 * sign-in on one is a sign-in on the other.
 */
import { movedPath } from '#lib/paths';

const origin = (name: string): string | null => {
	const value = process.env[name]?.trim();
	return value ? (URL.parse(value)?.origin ?? null) : null;
};

/** Where links to mail pages should point (in an email, a claim URL). */
export const publicOrigin = (url: URL): string => origin('CANONICAL_ORIGIN') ?? url.origin;

/** The OIDC issuer: `iss` in tokens and the base of every discovery endpoint. */
export const oidcIssuer = (url: URL): string => origin('OIDC_ISSUER') ?? url.origin;

const isOidc = (path: string) => path.startsWith('/oidc/') || path === '/.well-known/openid-configuration';

/** Where to send this request instead, or null to serve it here. */
export function hostRedirect(url: URL, request: Request): string | null {
	if (request.method !== 'GET' && request.method !== 'HEAD') return null;
	const path = url.pathname;
	if (isOidc(path)) {
		const issuer = origin('OIDC_ISSUER');
		return issuer && issuer !== url.origin ? `${issuer}${path}${url.search}` : null;
	}
	const canonical = origin('CANONICAL_ORIGIN');
	if (!canonical || canonical === url.origin) return null;
	// Page loads only: a fetch or EventSource from a page still open here stays
	// here (sent to another host, CORS would refuse it).
	const page =
		request.headers.get('sec-fetch-mode') === 'navigate' || (request.headers.get('accept') ?? '').includes('text/html');
	if (!page) return null;
	// An Android WebView: the Capacitor shell's installed builds have
	// webmail.zaur.app baked in and would open another host in the system
	// browser. Webmail still serves everything, so they stay.
	if ((request.headers.get('user-agent') ?? '').includes('; wv)')) return null;
	// The old paths are Stalwart's on the canonical host.
	return `${canonical}${movedPath(path) ?? path}${url.search}`;
}
