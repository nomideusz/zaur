import { randomBytes } from 'node:crypto';
import {
	getStalwartOauthClientId,
	getStalwartOauthDiscovery,
	getStalwartOauthIssuer,
	getStalwartOauthRedirectUri,
	getStalwartOauthScopes
} from './oauth-config';
import { exchangeOauthCode, type OauthTokens } from './oauth-token';
import { browserRedirectUri, buildAuthorizationUrl, createPkceChallenge } from './oauth-utils';
import {
	createStalwartAuthPayload,
	createStalwartPasskeyPayload,
	describeStalwartAuthResponse,
	parsePasskeyOptions,
	parseStalwartAuthResponse,
	parseStalwartPasskeyResponse,
	type PasskeyAssertion,
	type PasskeySignInOptions
} from '@zaur/mail-core/auth/contract';
import { MAIL_SCOPE } from '@zaur/mail-core/auth/stalwart';
import { log } from './log';

export type CredentialAuthResult =
	| { status: 'authenticated'; tokens: OauthTokens }
	| { status: 'mfa_required' }
	| { status: 'failure' };

export class StalwartAuthError extends Error {
	constructor(message = 'Stalwart authentication is unavailable') {
		super(message);
		this.name = 'StalwartAuthError';
	}
}


export async function authenticateStalwartCredentials(input: {
	accountName: string;
	accountSecret: string;
	mfaToken?: string;
	requestOrigin: string;
}): Promise<CredentialAuthResult> {
	const verifier = randomBytes(48).toString('base64url');
	const redirectUri = getStalwartOauthRedirectUri(input.requestOrigin);
	const discovery = await getStalwartOauthDiscovery();
	const authUrl = new URL('/api/auth', getStalwartOauthIssuer()).toString();
	const scopes = getStalwartOauthScopes(discovery);
	if (!scopes.includes(MAIL_SCOPE)) throw new StalwartAuthError();

	let response: Response;
	try {
		response = await fetch(authUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify(
				createStalwartAuthPayload({
				accountName: input.accountName,
				accountSecret: input.accountSecret,
				mfaToken: input.mfaToken,
				clientId: getStalwartOauthClientId(),
				redirectUri,
				scope: scopes.join(' '),
				codeChallenge: createPkceChallenge(verifier)
				})
			),
			signal: AbortSignal.timeout(10_000)
		});
	} catch {
		throw new StalwartAuthError();
	}

	if (!response.ok) {
		if (response.status === 401) return { status: 'failure' };
		throw new StalwartAuthError();
	}
	const rawBody: unknown = await response.json().catch(() => null);
	const body = parseStalwartAuthResponse(rawBody);
	if (!body) {
		log.warn('stalwart_auth_contract_mismatch', {
			status: response.status,
			...describeStalwartAuthResponse(rawBody)
		});
		throw new StalwartAuthError();
	}
	if (body.type === 'mfaRequired') return { status: 'mfa_required' };
	if (body.type === 'failure') return { status: 'failure' };
	if (body.type !== 'authenticated' || !body.clientCode) throw new StalwartAuthError();

	// The returned code is short-lived and exchanged entirely server-side.
	const tokens = await exchangeOauthCode({
		code: body.clientCode,
		codeVerifier: verifier,
		redirectUri
	});
	warnIfMailScopeMissing(tokens);
	return { status: 'authenticated', tokens };
}

export type PasskeyAuthResult =
	| { status: 'authenticated'; tokens: OauthTokens }
	/** No account holds this passkey (removed, or made for another server). */
	| { status: 'unknown' }
	| { status: 'failure' };

/** A fresh sign-in challenge from Stalwart 1.1 (good for five minutes, used once). */
export async function getStalwartPasskeyOptions(): Promise<PasskeySignInOptions> {
	let response: Response;
	try {
		response = await fetch(new URL('/api/auth', getStalwartOauthIssuer()), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify({ type: 'passkeyOptions' }),
			signal: AbortSignal.timeout(10_000)
		});
	} catch {
		throw new StalwartAuthError();
	}
	const options = response.ok ? parsePasskeyOptions(await response.json().catch(() => null)) : null;
	if (!options) throw new StalwartAuthError();
	return options;
}

/**
 * A passkey sign-in run in the browser on the issuer's own origin (Stalwart
 * checks the assertion's origin, not where this request comes from), finished
 * like the password flow: PKCE'd here, the code exchanged here.
 */
export async function authenticateStalwartPasskey(input: {
	credential: PasskeyAssertion;
	requestOrigin: string;
}): Promise<PasskeyAuthResult> {
	const verifier = randomBytes(48).toString('base64url');
	const redirectUri = getStalwartOauthRedirectUri(input.requestOrigin);
	let scopes: string[];
	try {
		scopes = getStalwartOauthScopes(await getStalwartOauthDiscovery());
	} catch {
		throw new StalwartAuthError();
	}
	if (!scopes.includes(MAIL_SCOPE)) throw new StalwartAuthError();

	let response: Response;
	try {
		response = await fetch(new URL('/api/auth', getStalwartOauthIssuer()), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify(
				createStalwartPasskeyPayload({
					credential: input.credential,
					clientId: getStalwartOauthClientId(),
					redirectUri,
					scope: scopes.join(' '),
					codeChallenge: createPkceChallenge(verifier)
				})
			),
			signal: AbortSignal.timeout(10_000)
		});
	} catch {
		throw new StalwartAuthError();
	}
	if (response.status === 401) return { status: 'failure' };
	// A malformed assertion is refused as a bad request: the person's to retry.
	if (response.status === 400) return { status: 'failure' };
	if (!response.ok) throw new StalwartAuthError();
	const rawBody: unknown = await response.json().catch(() => null);
	const body = parseStalwartPasskeyResponse(rawBody);
	if (!body) {
		log.warn('stalwart_passkey_contract_mismatch', {
			status: response.status,
			...describeStalwartAuthResponse(rawBody)
		});
		throw new StalwartAuthError();
	}
	if (body.type === 'passkeyUnknown') return { status: 'unknown' };
	if (body.type !== 'authenticated') return { status: 'failure' };

	const tokens = await exchangeOauthCode({ code: body.clientCode, codeVerifier: verifier, redirectUri });
	warnIfMailScopeMissing(tokens);
	return { status: 'authenticated', tokens };
}

function warnIfMailScopeMissing(tokens: OauthTokens): void {
	if (tokens.scope && !tokens.scope.split(/\s+/).includes(MAIL_SCOPE)) {
		log.warn('stalwart_oauth_scope_not_echoed', {
			grantedScopes: tokens.scope.split(/\s+/).filter(Boolean).slice(0, 20)
		});
	}
}

/*
 * Signing in on Stalwart's own page, for what the credential flow above cannot
 * do: passkeys. A WebAuthn sign-in must run in the browser on the issuer's
 * exact origin (Stalwart's relying party is the host of its public URL), so
 * the browser goes to the authorization endpoint and comes back with a code.
 */

/**
 * Where Stalwart's page sends the browser back to: the host it left from.
 * Every host mail is served on must be a redirect URI of the OAuthClient.
 * Deliberately not STALWART_OAUTH_REDIRECT_URI, which only names the
 * server-side flow's (never visited) URI and may be another host.
 */
export const getStalwartBrowserRedirectUri = browserRedirectUri;

export interface StalwartAuthorization {
	/** Stalwart's authorization endpoint with the whole request in its query. */
	url: string;
	state: string;
	codeVerifier: string;
	redirectUri: string;
}

export async function beginStalwartAuthorization(input: {
	requestOrigin: string;
}): Promise<StalwartAuthorization> {
	let discovery;
	try {
		discovery = await getStalwartOauthDiscovery();
	} catch {
		throw new StalwartAuthError();
	}
	const scopes = getStalwartOauthScopes(discovery);
	if (!scopes.includes(MAIL_SCOPE)) throw new StalwartAuthError();
	const codeVerifier = randomBytes(48).toString('base64url');
	const state = randomBytes(24).toString('base64url');
	const redirectUri = getStalwartBrowserRedirectUri(input.requestOrigin);
	const url = buildAuthorizationUrl({
		authorizationEndpoint: discovery.authorization_endpoint,
		clientId: getStalwartOauthClientId(),
		redirectUri,
		scopes,
		state,
		codeVerifier
	});
	return { url, state, codeVerifier, redirectUri };
}

/** The code Stalwart's page returned, exchanged server-side with the flow's verifier. */
export async function completeStalwartAuthorization(input: {
	code: string;
	codeVerifier: string;
	redirectUri: string;
}): Promise<OauthTokens> {
	const tokens = await exchangeOauthCode(input);
	warnIfMailScopeMissing(tokens);
	return tokens;
}

const PASSKEY_PROBE_TTL_MS = 10 * 60_000;
let passkeyProbe: { issuer: string; supported: boolean; at: number } | null = null;

/**
 * Whether Stalwart's sign-in page offers passkeys (v1.1 and later): it hands
 * out passkey options, where older servers refuse the request type. Cached
 * for ten minutes either way; unreachable counts as no.
 */
export async function stalwartSupportsPasskeys(): Promise<boolean> {
	let issuer: string;
	try {
		issuer = getStalwartOauthIssuer();
	} catch {
		return false;
	}
	const now = Date.now();
	if (passkeyProbe?.issuer === issuer && now - passkeyProbe.at < PASSKEY_PROBE_TTL_MS) {
		return passkeyProbe.supported;
	}
	let supported = false;
	try {
		const response = await fetch(new URL('/api/auth', issuer), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify({ type: 'passkeyOptions' }),
			signal: AbortSignal.timeout(5000)
		});
		supported = response.ok && parsePasskeyOptions(await response.json().catch(() => null)) !== null;
	} catch {
		supported = false;
	}
	passkeyProbe = { issuer, supported, at: now };
	return supported;
}
