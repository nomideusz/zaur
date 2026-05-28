import { json, type RequestHandler } from '@sveltejs/kit';
import { appConfig } from '$lib/config';
import { createConnectedClient } from '$lib/server/jmap';
import { classifyJmapError, loginErrorMessage } from '$lib/jmap/errors';
import { findIdentityEmail, normalizeEmail } from '$lib/jmap/account';
import { writeSession } from '$lib/server/session';
import { env } from '$env/dynamic/private';
import { exchangePasswordForTokens, decodeJwt } from '$lib/server/oauth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	let body: { email?: string; password?: string; totp?: string; rememberMe?: boolean };
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
		let client;
		let sessionData;

		if (env.OAUTH_ENABLED === 'true') {
			// 1. Authenticate with Keycloak via ROPC
			const tokens = await exchangePasswordForTokens(email, password);
			if (!tokens.access_token) {
				throw new Error('No access token returned from authorization server');
			}

			// 2. Decode token to verify email
			const jwtPayload = decodeJwt(tokens.access_token);
			const jwtEmail = normalizeEmail(jwtPayload?.email || jwtPayload?.preferred_username || '');

			// 3. Connect to Stalwart JMAP via OIDC Bearer token
			client = await createConnectedClient({
				serverUrl,
				username: jwtPayload?.preferred_username || jwtEmail || email,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token
			});

			sessionData = {
				serverUrl,
				username: jwtPayload?.preferred_username || jwtEmail || email,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token
			};
		} else {
			// Fallback to direct JMAP authentication (Stalwart local user db)
			client = await createConnectedClient({
				serverUrl,
				username: email,
				password: effectivePassword
			});

			sessionData = {
				serverUrl,
				username: email,
				password: effectivePassword
			};
		}

		const identities = await client.getIdentities();
		const primary = findIdentityEmail(identities, email) ?? identities[0];

		writeSession(
			cookies,
			sessionData,
			{ remember: body.rememberMe === true }
		);

		return json({
			serverUrl,
			username: sessionData.username,
			displayName: primary?.name ?? primary?.email ?? sessionData.username,
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
