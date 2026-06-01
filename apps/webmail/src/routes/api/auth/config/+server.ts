import { error, json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { buildAuthorizationUrl } from '$lib/server/oauth';
import { getOidcDiscovery, isOauthEnabled, isPasswordLoginEnabled } from '$lib/server/oidc-discovery';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';

export const GET: RequestHandler = async () => {
	if (!isOauthEnabled()) {
		return json({
			enabled: false,
			passwordFallback: true
		});
	}

	try {
		const discovery = await getOidcDiscovery();
		const passwordFallback = isPasswordLoginEnabled();
		return json({
			enabled: true,
			passwordFallback,
			passkeyEnabled: true,
			passkeyOnly: !passwordFallback,
			clientId: env.OAUTH_CLIENT_ID || 'webmail',
			issuerUrl: discovery.issuer,
			authorizationEndpoint: discovery.authorization_endpoint
		});
	} catch (err) {
		console.error('[auth/config] OIDC discovery failed:', err);
		return json(
			{
				enabled: false,
				passwordFallback: true,
				error: 'Identity provider is unavailable'
			},
			{ status: 503 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	if (!isOauthEnabled()) {
		error(503, 'Single sign-on is not configured');
	}

	const clientAddress = getClientAddress(request);
	const limit = checkRateLimit({
		key: `oauth-start:${clientAddress}`,
		limit: 30,
		windowMs: 15 * 60 * 1000
	});
	if (!limit.allowed) {
		error(429, `Too many sign-in attempts. Try again in ${limit.retryAfterSec}s.`);
	}

	let body: {
		state?: string;
		codeChallenge?: string;
		redirectUri?: string;
		loginHint?: string;
	};
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid request body');
	}

	const { state, codeChallenge, redirectUri, loginHint } = body;
	if (!state || !codeChallenge || !redirectUri) {
		error(400, 'state, codeChallenge, and redirectUri are required');
	}

	try {
		const url = await buildAuthorizationUrl({
			state,
			codeChallenge,
			redirectUri,
			loginHint
		});
		return json({ url });
	} catch (err) {
		console.error('[auth/config] Failed to build authorization URL:', err);
		error(503, 'Identity provider is unavailable');
	}
};
