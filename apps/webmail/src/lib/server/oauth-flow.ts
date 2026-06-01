import { randomBytes, createHash } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { buildAuthorizationUrl } from '$lib/server/oauth';

export const OAUTH_VERIFIER_COOKIE = 'oauth_code_verifier';
export const OAUTH_STATE_COOKIE = 'oauth_state';
export const OAUTH_REMEMBER_COOKIE = 'oauth_remember_me';
export const OAUTH_REDIRECT_COOKIE = 'oauth_redirect_to';

const OAUTH_FLOW_MAX_AGE_SEC = 10 * 60;

function randomString(bytes = 32): string {
	return randomBytes(bytes).toString('base64url');
}

function challengeFromVerifier(verifier: string): string {
	return createHash('sha256').update(verifier).digest('base64url');
}

const cookieOpts = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: process.env.NODE_ENV === 'production',
	maxAge: OAUTH_FLOW_MAX_AGE_SEC
};

export function clearOauthFlowCookies(cookies: Cookies) {
	for (const name of [
		OAUTH_VERIFIER_COOKIE,
		OAUTH_STATE_COOKIE,
		OAUTH_REMEMBER_COOKIE,
		OAUTH_REDIRECT_COOKIE
	]) {
		cookies.delete(name, { path: '/' });
	}
}

export async function startOauthRedirect(input: {
	cookies: Cookies;
	redirectUri: string;
	loginHint?: string;
	oneTimeToken?: string;
	rememberMe?: boolean;
	redirectTo?: string;
}): Promise<string> {
	const verifier = randomString(48);
	const state = randomString(32);

	input.cookies.set(OAUTH_VERIFIER_COOKIE, verifier, cookieOpts);
	input.cookies.set(OAUTH_STATE_COOKIE, state, cookieOpts);
	input.cookies.set(OAUTH_REMEMBER_COOKIE, input.rememberMe ? '1' : '0', cookieOpts);
	if (input.redirectTo) {
		input.cookies.set(OAUTH_REDIRECT_COOKIE, input.redirectTo, cookieOpts);
	} else {
		input.cookies.delete(OAUTH_REDIRECT_COOKIE, { path: '/' });
	}

	return buildAuthorizationUrl({
		redirectUri: input.redirectUri,
		state,
		codeChallenge: challengeFromVerifier(verifier),
		loginHint: input.loginHint,
		oneTimeToken: input.oneTimeToken
	});
}

export function readOauthFlow(cookies: Cookies, state: string | undefined) {
	const expectedState = cookies.get(OAUTH_STATE_COOKIE);
	if (!expectedState || !state || expectedState !== state) {
		return null;
	}

	const codeVerifier = cookies.get(OAUTH_VERIFIER_COOKIE);
	if (!codeVerifier) return null;

	return {
		codeVerifier,
		rememberMe: cookies.get(OAUTH_REMEMBER_COOKIE) === '1',
		redirectTo: cookies.get(OAUTH_REDIRECT_COOKIE) || undefined
	};
}
