import { error, json, type RequestHandler } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { oidcKeypair, oidcProviderClient } from '$lib/server/oidc';
import { consumeAuthCode, secretsEqual, signIdToken, verifyPkceS256 } from '$lib/server/oidc/core';
import { getStoreDb } from '$lib/server/store-instance';

const NO_STORE = { 'Cache-Control': 'no-store', Pragma: 'no-cache' };
const TOKEN_TTL_S = 3600;

export const POST: RequestHandler = async ({ request, url }) => {
	const client = oidcProviderClient();
	if (!client) error(404, 'Not found');

	const form = await request.formData().catch(() => null);
	if (!form) return json({ error: 'invalid_request' }, { status: 400, headers: NO_STORE });
	const field = (name: string) => String(form.get(name) ?? '');

	// client_secret_basic or client_secret_post
	let clientId = field('client_id');
	let clientSecret = field('client_secret');
	const authHeader = request.headers.get('authorization');
	if (authHeader?.toLowerCase().startsWith('basic ')) {
		const [id, ...secret] = Buffer.from(authHeader.slice(6), 'base64').toString().split(':');
		clientId = decodeURIComponent(id ?? '');
		clientSecret = decodeURIComponent(secret.join(':'));
	}
	if (clientId !== client.clientId || !secretsEqual(clientSecret, client.clientSecret)) {
		return json(
			{ error: 'invalid_client' },
			{ status: 401, headers: { ...NO_STORE, 'WWW-Authenticate': 'Basic realm="oidc"' } }
		);
	}

	if (field('grant_type') !== 'authorization_code') {
		return json({ error: 'unsupported_grant_type' }, { status: 400, headers: NO_STORE });
	}

	const data = consumeAuthCode(getStoreDb(), field('code'));
	if (
		!data ||
		data.clientId !== clientId ||
		data.redirectUri !== field('redirect_uri') ||
		!verifyPkceS256(field('code_verifier'), data.codeChallenge)
	) {
		return json({ error: 'invalid_grant' }, { status: 400, headers: NO_STORE });
	}

	const iat = Math.floor(Date.now() / 1000);
	const idToken = signIdToken(oidcKeypair(), {
		iss: url.origin,
		sub: data.claims.sub,
		aud: clientId,
		iat,
		exp: iat + TOKEN_TTL_S,
		...(data.nonce ? { nonce: data.nonce } : {}),
		preferred_username: data.claims.preferred_username,
		email: data.claims.email
	});
	return json(
		{
			access_token: randomBytes(32).toString('base64url'),
			token_type: 'bearer',
			expires_in: TOKEN_TTL_S,
			scope: 'openid',
			id_token: idToken
		},
		{ headers: NO_STORE }
	);
};
