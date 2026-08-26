import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { readSession } from '$lib/server/session';
import { oidcProviderClient, resolveOidcIdentity } from '$lib/server/oidc';
import { createAuthCode } from '$lib/server/oidc/core';
import { getStoreDb } from '$lib/server/store-instance';
import { log } from '$lib/server/log';

const CODE_TTL_MS = 60_000;

export const GET: RequestHandler = async ({ url, cookies }) => {
	const client = oidcProviderClient();
	if (!client) error(404, 'Not found');

	const params = url.searchParams;
	const redirectUri = params.get('redirect_uri') ?? '';
	// Never redirect to an unvalidated redirect_uri — hard error instead.
	if (params.get('client_id') !== client.clientId || !client.redirectUris.includes(redirectUri)) {
		error(400, 'Unknown client or redirect_uri');
	}

	const state = params.get('state');
	const back = (code: string): never => {
		const query = new URLSearchParams({ error: code });
		if (state) query.set('state', state);
		redirect(302, `${redirectUri}?${query}`);
	};

	if (params.get('response_type') !== 'code') back('unsupported_response_type');
	if (!(params.get('scope') ?? '').split(/\s+/).includes('openid')) back('invalid_scope');
	const codeChallenge = params.get('code_challenge');
	if (!codeChallenge || params.get('code_challenge_method') !== 'S256') back('invalid_request');

	const toLogin = (): never => {
		redirect(302, `/login?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
	};
	const session = readSession(cookies);
	if (!session) toLogin();

	let claims;
	try {
		claims = await resolveOidcIdentity(session!);
	} catch (err) {
		// Session tokens are beyond refresh — a fresh login fixes both.
		log.warn('oidc_identity_unresolved', { username: session!.username }, err);
		toLogin();
	}

	const code = createAuthCode(
		getStoreDb(),
		{ clientId: client.clientId, redirectUri, codeChallenge: codeChallenge!, nonce: params.get('nonce') ?? undefined, claims: claims! },
		CODE_TTL_MS
	);
	const query = new URLSearchParams({ code });
	if (state) query.set('state', state);
	redirect(302, `${redirectUri}?${query}`);
};
