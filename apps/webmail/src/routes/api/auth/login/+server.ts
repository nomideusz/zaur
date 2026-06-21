import { json, type RequestHandler } from '@sveltejs/kit';
import { appConfig } from '$lib/config';
import { createConnectedClient } from '$lib/server/jmap';
import { classifyJmapError, loginErrorMessage } from '$lib/jmap/errors';
import { findIdentityEmail, normalizeEmail } from '$lib/jmap/account';
import { addAccount, writeSession } from '$lib/server/session';
import { isOauthEnabled, isPasswordLoginEnabled } from '$lib/server/oidc-discovery';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const clientAddress = getClientAddress(request);
	const limit = checkRateLimit({
		key: `password-login:${clientAddress}`,
		limit: 10,
		windowMs: 15 * 60 * 1000
	});
	if (!limit.allowed) {
		return json(
			{ error: `Too many sign-in attempts. Try again in ${limit.retryAfterSec}s.` },
			{ status: 429 }
		);
	}

	if (isOauthEnabled() && !isPasswordLoginEnabled()) {
		return json(
			{
				error: 'Password sign-in is disabled. Use your passkey instead.',
				code: 'oauth_required'
			},
			{ status: 403 }
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

	const effectivePassword = body.totp?.trim() ? `${password}$${body.totp.trim()}` : password;
	
	const serverUrl = appConfig.jmapServerUrl;

	try {
		const client = await createConnectedClient({
			serverUrl,
			username: email,
			password: effectivePassword
		});

		const identities = await client.getIdentities();
		const primary = findIdentityEmail(identities, email) ?? identities[0];
		const displayName = primary?.name ?? primary?.email ?? email;

		const sessionData = {
			serverUrl,
			username: email,
			displayName,
			password: effectivePassword
		};

		// 'add' appends to (and activates within) the current session; otherwise replace it.
		if (body.add === true) {
			addAccount(cookies, sessionData, { remember: body.rememberMe === true });
		} else {
			writeSession(cookies, sessionData, { remember: body.rememberMe === true });
		}

		return json({
			serverUrl,
			username: sessionData.username,
			displayName,
			identities: identities.map((identity) => ({
				id: identity.id,
				name: identity.name,
				email: identity.email,
				replyTo: identity.replyTo
			}))
		});
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
