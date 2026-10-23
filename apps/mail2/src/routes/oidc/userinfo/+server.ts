import { error, json, type RequestHandler } from '@sveltejs/kit';
import { verifyAccessToken } from '@zaur/server-auth/oidc';
import { oidcClients, oidcKeypair } from '#lib/server/oidc';

const CLAIMS = ['sub', 'preferred_username', 'email', 'email_verified', 'name', 'groups'];

/* Bearer access token from /oidc/token; it carries the claims, so nothing to look up. */
export const GET: RequestHandler = ({ request }) => {
	if (!oidcClients().length) error(404, 'Not found');

	const authorization = request.headers.get('authorization') ?? '';
	const token = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';
	const claims = token ? verifyAccessToken(oidcKeypair(), token) : null;
	if (!claims) {
		return json(
			{ error: 'invalid_token' },
			{ status: 401, headers: { 'Cache-Control': 'no-store', 'WWW-Authenticate': 'Bearer error="invalid_token"' } }
		);
	}
	return json(Object.fromEntries(CLAIMS.filter((k) => k in claims).map((k) => [k, claims[k]])), {
		headers: { 'Cache-Control': 'no-store' }
	});
};
