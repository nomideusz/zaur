import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { getStoreDb, readSession } from '@zaur/server-auth';
import { createAuthCode } from '@zaur/server-auth/oidc';
import { findOidcClient, oidcClients, resolveOidcClaims } from '#lib/server/oidc';

/*
 * Authorization code flow with mandatory PKCE (S256). Not signed in, or the
 * session's tokens are past refreshing: through /login and back here.
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!oidcClients().length) error(404, 'Not found');

	const params = url.searchParams;
	const redirectUri = params.get('redirect_uri') ?? '';
	const client = findOidcClient(params.get('client_id'));
	// Never redirect to an unvalidated redirect_uri — hard error instead.
	if (!client || !client.redirectUris.includes(redirectUri)) error(400, 'Unknown client or redirect_uri');

	const state = params.get('state');
	const back = (query: Record<string, string>): never => {
		const search = new URLSearchParams(query);
		if (state) search.set('state', state);
		// Registered redirect_uri only (checked above).
		redirect(302, `${redirectUri}?${search}`, { external: true });
	};
	if (params.get('response_type') !== 'code') back({ error: 'unsupported_response_type' });
	if (!(params.get('scope') ?? '').split(/\s+/).includes('openid')) back({ error: 'invalid_scope' });
	const codeChallenge = params.get('code_challenge');
	if (!codeChallenge || params.get('code_challenge_method') !== 'S256') back({ error: 'invalid_request' });

	const toLogin = `/login?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`;
	const account = readSession(cookies);
	if (!account) redirect(302, toLogin);
	let claims;
	try {
		claims = await resolveOidcClaims(account);
	} catch (cause) {
		console.warn('[oidc] identity unresolved, signing in again', account.username, cause);
		redirect(302, toLogin);
	}

	const code = createAuthCode(
		getStoreDb(),
		{ clientId: client.clientId, redirectUri, codeChallenge: codeChallenge!, nonce: params.get('nonce') ?? undefined, claims },
		60_000
	);
	return back({ code });
};
