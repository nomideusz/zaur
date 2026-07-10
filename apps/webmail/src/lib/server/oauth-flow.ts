import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { getStoreDb } from './store-instance';
import { consumeOauthFlowRow, putOauthFlowRow } from './store-db';
import { sealSession, unsealSession } from './session-crypto';
import {
	getStalwartOauthClientId,
	getStalwartOauthDiscovery,
	getStalwartOauthScopes
} from './oauth-config';
import { createPkceChallenge, sanitizeLocalRedirect, sha256Base64Url } from './oauth-utils';

export { createPkceChallenge, sanitizeLocalRedirect } from './oauth-utils';

const FLOW_COOKIE_PREFIX = 'zaur_oauth_flow_';
const FLOW_MAX_AGE_SEC = 10 * 60;

export type OauthFlowMode = 'login' | 'add';

interface OauthFlowPayload {
	codeVerifier: string;
	browserNonce: string;
	redirectUri: string;
	redirectTo?: string;
	mode: OauthFlowMode;
	rememberMe: boolean;
	originatingSessionId?: string;
}

function randomString(bytes: number): string {
	return randomBytes(bytes).toString('base64url');
}

function nonceMatches(actual: string | undefined, expected: string): boolean {
	if (!actual) return false;
	const a = Buffer.from(actual);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

function flowCookieName(state: string): string {
	return `${FLOW_COOKIE_PREFIX}${sha256Base64Url(state).slice(0, 16)}`;
}

export async function createOauthFlow(input: {
	cookies: Cookies;
	redirectUri: string;
	redirectTo?: string;
	mode: OauthFlowMode;
	rememberMe: boolean;
	originatingSessionId?: string;
	loginHint?: string;
}): Promise<string> {
	const state = randomString(32);
	const codeVerifier = randomString(48);
	const browserNonce = randomString(32);
	const payload: OauthFlowPayload = {
		codeVerifier,
		browserNonce,
		redirectUri: input.redirectUri,
		redirectTo: sanitizeLocalRedirect(input.redirectTo),
		mode: input.mode,
		rememberMe: input.rememberMe,
		originatingSessionId: input.originatingSessionId
	};

	putOauthFlowRow(getStoreDb(), {
		stateHash: sha256Base64Url(state),
		sealedData: sealSession(payload),
		expiresAt: Date.now() + FLOW_MAX_AGE_SEC * 1000
	});
	input.cookies.set(flowCookieName(state), browserNonce, {
		path: '/api/auth/oauth/callback',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: FLOW_MAX_AGE_SEC
	});

	const discovery = await getStalwartOauthDiscovery();
	const url = new URL(discovery.authorization_endpoint);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', getStalwartOauthClientId());
	url.searchParams.set('redirect_uri', input.redirectUri);
	url.searchParams.set('scope', getStalwartOauthScopes(discovery).join(' '));
	url.searchParams.set('state', state);
	url.searchParams.set('code_challenge', createPkceChallenge(codeVerifier));
	url.searchParams.set('code_challenge_method', 'S256');
	url.searchParams.set('prompt', 'login');
	if (input.loginHint?.trim()) url.searchParams.set('login_hint', input.loginHint.trim());
	return url.toString();
}

export function consumeOauthFlow(
	cookies: Cookies,
	state: string | null
): OauthFlowPayload | null {
	if (!state) return null;
	const cookieName = flowCookieName(state);
	const browserNonce = cookies.get(cookieName);
	cookies.delete(cookieName, { path: '/api/auth/oauth/callback' });

	const row = consumeOauthFlowRow(getStoreDb(), sha256Base64Url(state));
	if (!row) return null;
	const payload = unsealSession(row.sealedData) as OauthFlowPayload | null;
	if (!payload || !nonceMatches(browserNonce, payload.browserNonce)) return null;
	return payload;
}
