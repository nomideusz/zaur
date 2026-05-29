import { json, type RequestHandler } from '@sveltejs/kit';
import { appConfig } from '$lib/config';
import { createConnectedClient } from '$lib/server/jmap';
import { classifyJmapError, loginErrorMessage } from '$lib/jmap/errors';
import { findIdentityEmail, normalizeEmail } from '$lib/jmap/account';
import { writeSession } from '$lib/server/session';
import { exchangeCodeForTokens, decodeJwt } from '$lib/server/oauth';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const clientAddress = getClientAddress(request);
	const limit = checkRateLimit({
		key: `oauth-token:${clientAddress}`,
		limit: 20,
		windowMs: 15 * 60 * 1000
	});
	if (!limit.allowed) {
		return json(
			{ error: `Too many sign-in attempts. Try again in ${limit.retryAfterSec}s.` },
			{ status: 429 }
		);
	}

	let body: {
		code?: string;
		codeVerifier?: string;
		redirectUri?: string;
		rememberMe?: boolean;
	};
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
		// Exchange authorization code for tokens from Logto (OIDC)
		const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);
		if (!tokens.access_token) {
			throw new Error('No access token returned from authorization server');
		}

		const jwtPayload = decodeJwt(tokens.id_token || tokens.access_token);
		const email = normalizeEmail(
			jwtPayload?.email || jwtPayload?.preferred_username || jwtPayload?.username || ''
		);
		if (!email) {
			throw new Error('Email claim not found in access token');
		}

		// 3. Connect to Stalwart JMAP via OIDC Bearer token to verify user account exists and retrieve identities
		const username = email || jwtPayload?.preferred_username || jwtPayload?.username || '';

		const client = await createConnectedClient({
			serverUrl,
			username,
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token
		});

		const identities = await client.getIdentities();
		const primary = findIdentityEmail(identities, email || username) ?? identities[0];

		writeSession(
			cookies,
			{
				serverUrl,
				username,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token
			},
			{ remember: body.rememberMe === true }
		);

		return json({
			serverUrl,
			username,
			displayName: primary?.name ?? primary?.email ?? username,
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
