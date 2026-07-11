// Direct Stalwart OAuth for public clients (native apps). Mirrors webmail's
// server-side flow (apps/webmail/src/lib/server/stalwart-auth.ts): PKCE S256
// via Stalwart's JSON `/api/auth` endpoint — no browser redirect, no client
// secret — then the standard token endpoint for code exchange and refresh.
// Crypto is injected so the module runs on Node (webcrypto), browsers, and
// React Native (expo-crypto) alike.
import { createStalwartAuthPayload, parseStalwartAuthResponse } from './contract';
import { createPkcePair, type PkceCrypto } from './pkce';

export type { PkceCrypto } from './pkce';
export { computePkceChallenge } from './pkce';

export interface OauthServerMetadata {
	issuer: string;
	token_endpoint: string;
	authorization_endpoint?: string;
	scopes_supported?: string[];
	code_challenge_methods_supported?: string[];
	token_endpoint_auth_methods_supported?: string[];
}

export interface OauthTokens {
	accessToken: string;
	refreshToken: string;
	accessTokenExpiresAt: number;
	scope?: string;
}

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

export const MAIL_SCOPE = 'urn:ietf:params:oauth:scope:mail';
export const DEFAULT_SCOPES = ['openid', 'offline_access', MAIL_SCOPE];

const REQUEST_TIMEOUT_MS = 10_000;

function withTimeout(): AbortSignal {
	// AbortSignal.timeout is missing on older Hermes; polyfill inline.
	if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
	const controller = new AbortController();
	setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	return controller.signal;
}

export async function discoverOauthMetadata(issuer: string): Promise<OauthServerMetadata> {
	const url = new URL('/.well-known/oauth-authorization-server', issuer).toString();
	const response = await fetch(url, {
		headers: { Accept: 'application/json' },
		signal: withTimeout()
	});
	if (!response.ok) throw new StalwartAuthError('OAuth discovery failed');
	const metadata = (await response.json()) as OauthServerMetadata;
	if (!metadata?.token_endpoint || !metadata.issuer) {
		throw new StalwartAuthError('OAuth discovery returned invalid metadata');
	}
	if (
		metadata.code_challenge_methods_supported &&
		!metadata.code_challenge_methods_supported.includes('S256')
	) {
		throw new StalwartAuthError('OAuth server does not support S256 PKCE');
	}
	return metadata;
}

interface RawTokenResponse {
	access_token?: string;
	refresh_token?: string;
	token_type?: string;
	expires_in?: number;
	scope?: string;
	error?: string;
}

async function requestTokens(
	tokenEndpoint: string,
	clientId: string,
	params: URLSearchParams
): Promise<OauthTokens> {
	params.set('client_id', clientId);
	const response = await fetch(tokenEndpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json'
		},
		body: params.toString(),
		signal: withTimeout()
	});
	const body = (await response.json().catch(() => ({}))) as RawTokenResponse;
	if (!response.ok) {
		throw new StalwartAuthError(body.error ?? 'OAuth token request failed');
	}
	return normalizeTokens(body, params.get('refresh_token') ?? undefined);
}

function normalizeTokens(body: RawTokenResponse, previousRefreshToken?: string): OauthTokens {
	if (!body.access_token || (body.token_type && body.token_type.toLowerCase() !== 'bearer')) {
		throw new StalwartAuthError('OAuth server returned an invalid access token response');
	}
	const refreshToken = body.refresh_token || previousRefreshToken;
	if (!refreshToken) throw new StalwartAuthError('OAuth server did not return a refresh token');
	const expiresIn = Math.max(60, Number(body.expires_in) || 3600);
	return {
		accessToken: body.access_token,
		refreshToken,
		accessTokenExpiresAt: Date.now() + expiresIn * 1000,
		scope: body.scope
	};
}

export async function authenticateWithCredentials(input: {
	issuer: string;
	clientId: string;
	redirectUri: string;
	accountName: string;
	accountSecret: string;
	mfaToken?: string;
	scopes?: string[];
	crypto: PkceCrypto;
}): Promise<CredentialAuthResult> {
	const metadata = await discoverOauthMetadata(input.issuer);
	const scopes = input.scopes ?? DEFAULT_SCOPES;
	const { verifier, challenge } = await createPkcePair(input.crypto);
	const authUrl = new URL('/api/auth', input.issuer).toString();

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
					clientId: input.clientId,
					redirectUri: input.redirectUri,
					scope: scopes.join(' '),
					codeChallenge: challenge
				})
			),
			signal: withTimeout()
		});
	} catch {
		throw new StalwartAuthError();
	}

	if (!response.ok) {
		if (response.status === 401) return { status: 'failure' };
		throw new StalwartAuthError();
	}
	const body = parseStalwartAuthResponse(await response.json().catch(() => null));
	if (!body) throw new StalwartAuthError();
	if (body.type === 'mfaRequired') return { status: 'mfa_required' };
	if (body.type === 'failure') return { status: 'failure' };

	const tokens = await requestTokens(
		metadata.token_endpoint,
		input.clientId,
		new URLSearchParams({
			grant_type: 'authorization_code',
			code: body.clientCode,
			code_verifier: verifier,
			redirect_uri: input.redirectUri
		})
	);
	return { status: 'authenticated', tokens };
}

export async function refreshOauthTokens(input: {
	issuer: string;
	clientId: string;
	refreshToken: string;
}): Promise<OauthTokens> {
	const metadata = await discoverOauthMetadata(input.issuer);
	return requestTokens(
		metadata.token_endpoint,
		input.clientId,
		new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: input.refreshToken
		})
	);
}
