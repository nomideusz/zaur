import { createHash } from 'node:crypto';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { command, form, getRequestEvent } from '$app/server';
import {
	addAccount,
	checkRateLimitRow,
	clearSession,
	deletePushSubscriptionsForSession,
	getStalwartPasskeyOptions,
	getStoreDb,
	readSessionFull,
	recordSessionDevice,
	writeSession,
	type SessionData
} from '@zaur/server-auth';
import { parsePasskeyAssertion, type PasskeySignInOptions } from '@zaur/mail-core';
import { attemptLogin, attemptPasskeyLogin, checkLoginRateLimits, getClientAddress } from '#lib/server/login';
import { passkeyCeremonyHere, passkeySignInAvailable } from '#lib/server/passkey-flow';
import { pushWatcher } from '#lib/server/push-watcher';
import { reportError } from '#lib/server/report';

export interface LoginResult {
	ok: boolean;
	error?: string;
	/** Set when Stalwart answered that this account needs a 2FA code. */
	requiresTotp?: boolean;
}

/**
 * Mail 2.0's own sign-in. A remote form (not a command) so the browser gets
 * standard form semantics; the session cookie is set on the POST response.
 */
export const login = form('unchecked', async (data): Promise<LoginResult> => {
	const event = getRequestEvent();

	const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
	const password = typeof data.password === 'string' ? data.password : '';
	const totp = typeof data.totp === 'string' ? data.totp : undefined;
	const remember = data.remember === 'on' || data.remember === true;
	/** From the account menu: join this browser's session instead of replacing it. */
	const adding = data.mode === 'add';

	if (!email || !password) {
		return { ok: false, error: 'Enter your email address and password.' };
	}

	const clientAddress = getClientAddress(event.request);
	const limit = checkLoginRateLimits(clientAddress, email);
	if (!limit.allowed) {
		return {
			ok: false,
			error: `Too many sign-in attempts. Try again in ${limit.retryAfterSec}s.`
		};
	}

	const result = await attemptLogin({
		email,
		password,
		totp,
		remember,
		requestOrigin: event.url.origin,
		clientAddress,
		userAgent: event.request.headers.get('user-agent')
	});

	switch (result.status) {
		case 'ok': {
			startSession(result.sessionData, { remember, adding, clientAddress });
			return { ok: true };
		}
		case 'mfa_required':
			return { ok: false, requiresTotp: true };
		case 'invalid_credentials':
			return { ok: false, error: 'Invalid email, password, or 2FA code.' };
		case 'unavailable':
			return { ok: false, error: 'Secure sign-in is temporarily unavailable.' };
		case 'error':
			return { ok: false, error: 'Sign-in failed. Please try again.' };
	}
});

/** Put a signed-in account in this browser's session cookie. */
function startSession(
	sessionData: SessionData,
	input: { remember: boolean; adding: boolean; clientAddress: string }
): void {
	const event = getRequestEvent();
	// addAccount keeps the accounts already signed in (and makes this one active);
	// writeSession starts a fresh session with just this one.
	if (input.adding) addAccount(event.cookies, sessionData, { remember: input.remember });
	else writeSession(event.cookies, sessionData, { remember: input.remember });
	recordSessionDevice(
		event.cookies,
		event.request.headers.get('user-agent'),
		// Same 16-char ip hash webmail records for the session device list.
		createHash('sha256').update(input.clientAddress).digest('base64url').slice(0, 16)
	);
}

/* ── Passkeys, run on this page (mail on the mail server's own origin) ─── */

const PASSKEY_WINDOW_MS = 15 * 60 * 1000;

/**
 * A sign-in challenge for the page's passkey ceremony. Null where the page may
 * not run it (another origin, or no passkeys on the server): the button then
 * goes through Stalwart's own page instead (/signin/passkey).
 */
export const passkeySignInOptions = command(async (): Promise<PasskeySignInOptions | null> => {
	const event = getRequestEvent();
	if (!passkeyCeremonyHere(event.url.origin) || !(await passkeySignInAvailable())) return null;
	// Each one is a record on the mail server: plenty for autofill refreshes and retries.
	const limit = checkRateLimitRow(
		getStoreDb(),
		`mail2-passkey-options:${getClientAddress(event.request)}`,
		60,
		PASSKEY_WINDOW_MS
	);
	if (!limit.allowed) error(429, 'Too many sign-in attempts');
	let options: PasskeySignInOptions;
	try {
		options = await getStalwartPasskeyOptions();
	} catch (cause) {
		reportError(cause, { where: 'passkey sign-in: options' });
		return null;
	}
	// The assertion must name this origin exactly, or Stalwart refuses it.
	return `https://${options.rpId}` === event.url.origin ? options : null;
});

export type PasskeyLoginResult =
	| { ok: true }
	| { ok: false; reason: 'unknown' | 'failed' | 'unavailable' | 'limited'; retryAfterSec?: number };

/** The page's passkey assertion, checked by Stalwart, opened as a session like a password sign-in. */
export const passkeyLogin = command(
	v.object({ credential: v.unknown(), remember: v.boolean(), adding: v.boolean() }),
	async ({ credential: raw, remember, adding }): Promise<PasskeyLoginResult> => {
		const event = getRequestEvent();
		if (!passkeyCeremonyHere(event.url.origin)) return { ok: false, reason: 'unavailable' };
		const credential = parsePasskeyAssertion(raw);
		if (!credential) return { ok: false, reason: 'failed' };
		const clientAddress = getClientAddress(event.request);
		const limit = checkRateLimitRow(
			getStoreDb(),
			`mail2-passkey-login:${clientAddress}`,
			10,
			PASSKEY_WINDOW_MS
		);
		if (!limit.allowed) return { ok: false, reason: 'limited', retryAfterSec: limit.retryAfterSec };

		const result = await attemptPasskeyLogin({ credential, requestOrigin: event.url.origin });
		switch (result.status) {
			case 'ok':
				startSession(result.sessionData, { remember, adding, clientAddress });
				return { ok: true };
			case 'unknown':
				return { ok: false, reason: 'unknown' };
			case 'invalid_credentials':
				return { ok: false, reason: 'failed' };
			default:
				return { ok: false, reason: 'unavailable' };
		}
	}
);

/**
 * Sign out: revokes the session record in the store and drops the cookie.
 * While sessions are shared with webmail 1.0 this signs out of both apps by
 * design — one store, one session record.
 */
export const logout = command(async () => {
	const { cookies } = getRequestEvent();
	const session = readSessionFull(cookies);
	// A signed-out browser must stop hearing about the mail it just left.
	if (session) {
		deletePushSubscriptionsForSession(getStoreDb(), session.id);
		pushWatcher.sync();
	}
	clearSession(cookies);
	return { ok: true };
});
