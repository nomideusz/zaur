/**
 * Zaur sign-in: an OIDC relying party of mail (the issuer Bartube and Photos
 * use too), authorization code + PKCE with a client secret.
 */
import { createHash, randomBytes } from 'node:crypto';
import type { User } from '#lib/types';

interface Discovery {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	end_session_endpoint?: string;
}

/** What /auth/login keeps in a cookie for /auth/callback. */
export interface LoginTransaction {
	state: string;
	nonce: string;
	verifier: string;
	next: string;
}

const issuer = () => (process.env.OIDC_ISSUER?.trim() || 'https://webmail.zaur.app').replace(/\/$/, '');
/** Mail's settings: the password, two-factor sign-in and devices of the account Music signs in with. */
export const accountUrl = () => `${issuer()}/settings`;
const clientId = () => process.env.OIDC_CLIENT_ID?.trim() || 'music';
const redirectUri = (origin: string) => `${origin}/auth/callback`;

let cached: { at: number; doc: Discovery } | undefined;
async function discovery(): Promise<Discovery> {
	if (cached && Date.now() - cached.at < 3600_000) return cached.doc;
	const response = await fetch(`${issuer()}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(10_000) });
	if (!response.ok) throw new Error(`OIDC discovery failed (${response.status})`);
	const doc = (await response.json()) as Discovery;
	if (doc.issuer !== issuer()) throw new Error('OIDC discovery answered for another issuer');
	cached = { at: Date.now(), doc };
	return doc;
}

const random = () => randomBytes(32).toString('base64url');

export async function beginLogin(origin: string, next: string): Promise<{ url: string; tx: LoginTransaction }> {
	const { authorization_endpoint } = await discovery();
	const tx = { state: random(), nonce: random(), verifier: random(), next };
	const query = new URLSearchParams({
		response_type: 'code',
		client_id: clientId(),
		redirect_uri: redirectUri(origin),
		scope: 'openid email profile',
		state: tx.state,
		nonce: tx.nonce,
		code_challenge: createHash('sha256').update(tx.verifier).digest('base64url'),
		code_challenge_method: 'S256'
	});
	return { url: `${authorization_endpoint}?${query}`, tx };
}

export async function finishLogin(origin: string, code: string, tx: LoginTransaction): Promise<User> {
	const { token_endpoint } = await discovery();
	const secret = process.env.OIDC_CLIENT_SECRET?.trim() ?? '';
	const basic = Buffer.from(`${encodeURIComponent(clientId())}:${encodeURIComponent(secret)}`).toString('base64');
	const response = await fetch(token_endpoint, {
		method: 'POST',
		headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri(origin),
			code_verifier: tx.verifier
		}),
		signal: AbortSignal.timeout(10_000)
	});
	const tokens = (await response.json().catch(() => ({}))) as { id_token?: string; error?: string };
	if (!response.ok || !tokens.id_token) throw new Error(`Token exchange failed: ${tokens.error ?? response.status}`);

	// The id_token comes straight from the token endpoint over TLS, in answer to
	// our client secret, so TLS stands in for the signature (OIDC Core 3.1.3.7 (6)).
	const claims = JSON.parse(Buffer.from(tokens.id_token.split('.')[1] ?? '', 'base64url').toString()) as Record<string, unknown>;
	const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
	if (
		claims.iss !== issuer() ||
		!audience.includes(clientId()) ||
		typeof claims.exp !== 'number' ||
		claims.exp * 1000 < Date.now() ||
		claims.nonce !== tx.nonce
	) {
		throw new Error('The id_token did not check out');
	}
	const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
	if (!email) throw new Error('The id_token carries no email');
	const name = typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim() : email.split('@')[0];
	return { email, name };
}

/** Mail's end_session_endpoint: signing out of Music signs out of mail, as Bartube does. */
export async function logoutUrl(origin: string): Promise<string> {
	const { end_session_endpoint } = await discovery();
	if (!end_session_endpoint) return '/';
	return `${end_session_endpoint}?${new URLSearchParams({ post_logout_redirect_uri: `${origin}/` })}`;
}
