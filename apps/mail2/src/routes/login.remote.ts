import { createHash } from 'node:crypto';
import { command, form, getRequestEvent } from '$app/server';
import { clearSession, recordSessionDevice, writeSession } from '@zaur/server-auth';
import { attemptLogin, checkLoginRateLimits, getClientAddress } from '#lib/server/login';

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
			writeSession(event.cookies, result.sessionData, { remember });
			recordSessionDevice(
				event.cookies,
				event.request.headers.get('user-agent'),
				// Same 16-char ip hash webmail records for the session device list.
				createHash('sha256').update(clientAddress).digest('base64url').slice(0, 16)
			);
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

/**
 * Sign out: revokes the session record in the store and drops the cookie.
 * While sessions are shared with webmail 1.0 this signs out of both apps by
 * design — one store, one session record.
 */
export const logout = command(async () => {
	clearSession(getRequestEvent().cookies);
	return { ok: true };
});
