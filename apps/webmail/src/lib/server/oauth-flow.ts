import { randomBytes, createHash } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { buildAuthorizationUrl } from '$lib/server/oauth';

export const OAUTH_VERIFIER_COOKIE = 'oauth_code_verifier';
export const OAUTH_STATE_COOKIE = 'oauth_state';
export const OAUTH_REMEMBER_COOKIE = 'oauth_remember_me';
export const OAUTH_REDIRECT_COOKIE = 'oauth_redirect_to';
export const PASSKEY_LOGTO_COOKIE = 'passkey_logto_cookies';
export const PASSKEY_VERIFICATION_COOKIE = 'passkey_verification_id';
export const PASSKEY_DISCOVERABLE_COOKIE = 'passkey_discoverable';

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

export function clearPasskeyFlowCookies(cookies: Cookies) {
	for (const name of [
		PASSKEY_LOGTO_COOKIE,
		PASSKEY_VERIFICATION_COOKIE,
		PASSKEY_DISCOVERABLE_COOKIE
	]) {
		cookies.delete(name, { path: '/' });
	}
}

export function setOauthFlowCookies(
	cookies: Cookies,
	input: {
		codeVerifier: string;
		state: string;
		rememberMe?: boolean;
		redirectTo?: string;
	}
) {
	cookies.set(OAUTH_VERIFIER_COOKIE, input.codeVerifier, cookieOpts);
	cookies.set(OAUTH_STATE_COOKIE, input.state, cookieOpts);
	cookies.set(OAUTH_REMEMBER_COOKIE, input.rememberMe ? '1' : '0', cookieOpts);
	if (input.redirectTo) {
		cookies.set(OAUTH_REDIRECT_COOKIE, input.redirectTo, cookieOpts);
	} else {
		cookies.delete(OAUTH_REDIRECT_COOKIE, { path: '/' });
	}
}

export function readPasskeyFlow(cookies: Cookies) {
	const logtoCookies = cookies.get(PASSKEY_LOGTO_COOKIE);
	if (!logtoCookies) return null;

	const discoverable = cookies.get(PASSKEY_DISCOVERABLE_COOKIE) === '1';
	const verificationId = cookies.get(PASSKEY_VERIFICATION_COOKIE) ?? undefined;
	if (!discoverable && !verificationId) return null;

	return { logtoCookies, verificationId, discoverable };
}

export async function startOauthRedirect(input: {
	cookies: Cookies;
	redirectUri: string;
	loginHint?: string;
	oneTimeToken?: string;
	directSignIn?: string;
	firstScreen?: string;
	identifier?: string;
	rememberMe?: boolean;
	redirectTo?: string;
}): Promise<string> {
	const verifier = randomString(48);
	const state = randomString(32);

	setOauthFlowCookies(input.cookies, {
		codeVerifier: verifier,
		state,
		rememberMe: input.rememberMe,
		redirectTo: input.redirectTo
	});

	return buildAuthorizationUrl({
		redirectUri: input.redirectUri,
		state,
		codeChallenge: challengeFromVerifier(verifier),
		loginHint: input.loginHint,
		oneTimeToken: input.oneTimeToken,
		directSignIn: input.directSignIn,
		firstScreen: input.firstScreen,
		identifier: input.identifier
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
