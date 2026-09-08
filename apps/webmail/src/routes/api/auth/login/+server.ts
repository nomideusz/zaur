import { createHash } from 'node:crypto';
import { json, type RequestHandler } from '@sveltejs/kit';
import { appConfig } from '$lib/config';
import { classifyJmapError, loginErrorMessage } from '$lib/jmap/errors';
import { normalizeEmail } from '$lib/jmap/account';
import { addAccount, recordSessionDevice, writeSession } from '$lib/server/session';
import { buildSessionFromCredentials } from '$lib/server/login-session';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	const clientAddress = getClientAddress(request);
	const limit = checkRateLimit({
		key: `password-login:${clientAddress}`,
		limit: 10,
		windowMs: 15 * 60 * 1000
	});
	if (!limit.allowed) {
		return json(
			{ error: `Too many sign-in attempts. Try again in ${limit.retryAfterSec}s.` },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
		);
	}

	let body: { email?: string; password?: string; totp?: string; rememberMe?: boolean; add?: boolean };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const email = normalizeEmail(body.email ?? '');
	const password = body.password;
	if (!email || !password) {
		return json({ error: 'Email and password are required' }, { status: 400 });
	}

	const emailKey = createHash('sha256').update(email).digest('base64url').slice(0, 24);
	const accountLimit = checkRateLimit({
		key: `password-login-account:${emailKey}`,
		limit: 20,
		windowMs: 15 * 60 * 1000
	});
	if (!accountLimit.allowed) {
		return json(
			{ error: `Too many sign-in attempts. Try again in ${accountLimit.retryAfterSec}s.` },
			{ status: 429, headers: { 'Retry-After': String(accountLimit.retryAfterSec) } }
		);
	}

	const serverUrl = appConfig.jmapServerUrl;

	try {
		const built = await buildSessionFromCredentials({
			email,
			password,
			totp: body.totp,
			requestOrigin: url.origin
		});
		if (built.status === 'mfa_required') {
			return json(
				{ requiresTotp: true, code: 'mfa_required' },
				{ status: 202, headers: { 'Cache-Control': 'no-store' } }
			);
		}
		if (built.status === 'invalid_credentials') {
			return json(
				{ error: 'Invalid email, password, or 2FA code.', code: 'invalid_credentials' },
				{ status: 401, headers: { 'Cache-Control': 'no-store' } }
			);
		}
		if (built.status === 'unavailable') {
			return json(
				{ error: 'Secure sign-in is temporarily unavailable.', code: 'server_unavailable' },
				{ status: 503, headers: { 'Cache-Control': 'no-store' } }
			);
		}
		const { sessionData, identities } = built;
		const displayName = sessionData.displayName ?? email;

		// 'add' appends to (and activates within) the current session; otherwise replace it.
		if (body.add === true) {
			addAccount(cookies, sessionData, { remember: body.rememberMe === true });
		} else {
			writeSession(cookies, sessionData, { remember: body.rememberMe === true });
		}
		recordSessionDevice(
			cookies,
			request.headers.get('user-agent'),
			createHash('sha256').update(clientAddress).digest('base64url').slice(0, 16)
		);

		return json(
			{
				serverUrl,
				username: sessionData.username,
				displayName,
				identities: identities.map((identity) => ({
					id: identity.id,
					name: identity.name,
					email: identity.email,
					replyTo: identity.replyTo
				}))
			},
			{ headers: { 'Cache-Control': 'no-store' } }
		);
	} catch (error) {
		console.error('[Login Error]:', error);
		const code = classifyJmapError(error);
		const message = loginErrorMessage(code, serverUrl);

		if (code === 'invalid_credentials') {
			return json({ error: message, code }, { status: 401 });
		}
		if (code === 'server_unavailable' || code === 'connection_failed') {
			return json({ error: message, code }, { status: 503 });
		}
		return json({ error: message, code: 'generic' }, { status: 502 });
	}
};
