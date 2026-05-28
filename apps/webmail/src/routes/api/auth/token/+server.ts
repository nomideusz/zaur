import { json, type RequestHandler } from '@sveltejs/kit';
import { appConfig } from '$lib/config';
import { createConnectedClient } from '$lib/server/jmap';
import { classifyJmapError, loginErrorMessage } from '$lib/jmap/errors';
import { findIdentityEmail, normalizeEmail } from '$lib/jmap/account';
import { writeSession } from '$lib/server/session';
import { exchangeCodeForTokens, decodeJwt } from '$lib/server/oauth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	let body: { code?: string; codeVerifier?: string; redirectUri?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { code, codeVerifier, redirectUri } = body;
	if (!code || !codeVerifier || !redirectUri) {
		return json({ error: 'code, codeVerifier, and redirectUri are required' }, { status: 400 });
	}

	const serverUrl = appConfig.jmapServerUrl;

	try {
		// 1. Exchange auth code for access & refresh tokens from Keycloak
		const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);
		if (!tokens.access_token) {
			throw new Error('No access token returned from authorization server');
		}

		// 2. Extract user email from JWT access/id token
		const jwtPayload = decodeJwt(tokens.access_token);
		const email = normalizeEmail(jwtPayload?.email || jwtPayload?.preferred_username || '');
		if (!email) {
			throw new Error('Email claim not found in access token');
		}

		// 3. Connect to Stalwart JMAP via OIDC Bearer token to verify user account exists and retrieve identities
		const client = await createConnectedClient({
			serverUrl,
			username: email,
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token
		});

		const identities = await client.getIdentities();
		const primary = findIdentityEmail(identities, email) ?? identities[0];

		// 4. Save session in cookies
		writeSession(
			cookies,
			{
				serverUrl,
				username: email,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token
			},
			{ remember: true }
		);

		return json({
			serverUrl,
			username: email,
			displayName: primary?.name ?? primary?.email ?? email,
			identities: identities.map((identity) => ({
				id: identity.id,
				name: identity.name,
				email: identity.email,
				replyTo: identity.replyTo
			}))
		});
	} catch (error) {
		console.error('[OAuth Login Error]:', error);
		const code = classifyJmapError(error);
		const message = error instanceof Error ? error.message : loginErrorMessage(code, serverUrl);
		return json({ error: message, code }, { status: 401 });
	}
};
