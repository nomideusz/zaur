/**
 * Passkey sign-in, which happens on Stalwart's own sign-in page: Stalwart only
 * accepts a passkey ceremony run on its own origin (the relying party is the
 * host of its public URL), so mail cannot run it on its own pages.
 *
 * /login/passkey starts an authorization-code request and keeps what it needs
 * to finish (state, PKCE verifier, where to go next) in a short-lived sealed
 * cookie. Stalwart sends the browser back to /api/auth/oauth/callback, which
 * checks the state, exchanges the code and opens the session.
 */
import type { Cookies } from '@sveltejs/kit';
import { isStalwartOauthEnabled, sealSession, stalwartSupportsPasskeys, unsealSession } from '@zaur/server-auth';
import { jmapAuthMode } from '#lib/server/login';

const COOKIE = 'zaur_passkey_flow';
const PATH = '/api/auth/oauth';
/** Stalwart keeps a passkey challenge for five minutes; leave room for the consent step. */
const MAX_AGE_S = 10 * 60;

export interface PasskeyFlow {
	state: string;
	codeVerifier: string;
	redirectUri: string;
	/** A same-app path, already checked by safeNext. */
	next: string;
	remember: boolean;
	/** Joining this browser's session (account menu → Add account) instead of replacing it. */
	adding: boolean;
}

/** Whether to offer the passkey button: Stalwart sign-in, on a server that has passkeys. */
export async function passkeySignInAvailable(): Promise<boolean> {
	return jmapAuthMode() === 'stalwart' && isStalwartOauthEnabled() && (await stalwartSupportsPasskeys());
}

export function savePasskeyFlow(cookies: Cookies, flow: PasskeyFlow): void {
	cookies.set(COOKIE, sealSession(flow), {
		path: PATH,
		httpOnly: true,
		// Stalwart's redirect back is a top-level GET from another site: Lax still sends it.
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: MAX_AGE_S
	});
}

/** The flow this browser started, read once: the cookie is dropped either way. */
export function takePasskeyFlow(cookies: Cookies): PasskeyFlow | null {
	const raw = cookies.get(COOKIE);
	if (!raw) return null;
	cookies.delete(COOKIE, { path: PATH });
	const flow = unsealSession(raw) as Partial<PasskeyFlow> | null;
	if (
		!flow ||
		typeof flow.state !== 'string' ||
		typeof flow.codeVerifier !== 'string' ||
		typeof flow.redirectUri !== 'string' ||
		typeof flow.next !== 'string'
	) {
		return null;
	}
	return {
		state: flow.state,
		codeVerifier: flow.codeVerifier,
		redirectUri: flow.redirectUri,
		next: flow.next,
		remember: flow.remember === true,
		adding: flow.adding === true
	};
}

/** Why a passkey sign-in came back without a session, as the login page's `?passkey=`. */
export type PasskeyOutcome = 'cancelled' | 'expired' | 'failed' | 'unavailable';

export function loginWithOutcome(outcome: PasskeyOutcome, next: string | null, adding: boolean): string {
	const params = new URLSearchParams({ passkey: outcome });
	if (next && next !== '/') params.set('next', next);
	if (adding) params.set('mode', 'add');
	return `/login?${params}`;
}
