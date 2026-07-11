export type { OauthTokens } from '@zaur/mail-core/auth/stalwart';
import type { OauthTokens } from '@zaur/mail-core/auth/stalwart';
import {
	getStalwartOauthClientId,
	getStalwartOauthClientSecret,
	getStalwartOauthDiscovery
} from './oauth-config';

interface RawTokenResponse {
	access_token?: string;
	refresh_token?: string;
	token_type?: string;
	expires_in?: number;
	scope?: string;
	error?: string;
}


export class OauthTokenError extends Error {
	constructor(
		message: string,
		readonly code?: string
	) {
		super(message);
		this.name = 'OauthTokenError';
	}
}

async function requestTokens(params: URLSearchParams): Promise<RawTokenResponse> {
	const discovery = await getStalwartOauthDiscovery();
	const clientId = getStalwartOauthClientId();
	const clientSecret = getStalwartOauthClientSecret();
	params.set('client_id', clientId);

	const headers: Record<string, string> = {
		'Content-Type': 'application/x-www-form-urlencoded',
		Accept: 'application/json'
	};
	if (clientSecret) {
		headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')}`;
	}

	const response = await fetch(discovery.token_endpoint, {
		method: 'POST',
		headers,
		body: params.toString(),
		signal: AbortSignal.timeout(10_000)
	});
	const body = (await response.json().catch(() => ({}))) as RawTokenResponse;
	if (!response.ok) {
		throw new OauthTokenError('Stalwart OAuth token request failed', body.error);
	}
	return body;
}

function normalizeTokens(body: RawTokenResponse, previousRefreshToken?: string): OauthTokens {
	if (!body.access_token || (body.token_type && body.token_type.toLowerCase() !== 'bearer')) {
		throw new OauthTokenError('Stalwart returned an invalid access token response');
	}
	const refreshToken = body.refresh_token || previousRefreshToken;
	if (!refreshToken) throw new OauthTokenError('Stalwart did not return a refresh token');
	const expiresIn = Math.max(60, Number(body.expires_in) || 3600);
	return {
		accessToken: body.access_token,
		refreshToken,
		accessTokenExpiresAt: Date.now() + expiresIn * 1000,
		scope: body.scope
	};
}

export async function exchangeOauthCode(input: {
	code: string;
	codeVerifier: string;
	redirectUri: string;
}): Promise<OauthTokens> {
	const params = new URLSearchParams({
		grant_type: 'authorization_code',
		code: input.code,
		code_verifier: input.codeVerifier,
		redirect_uri: input.redirectUri
	});
	return normalizeTokens(await requestTokens(params));
}

export async function refreshOauthTokens(refreshToken: string): Promise<OauthTokens> {
	const params = new URLSearchParams({
		grant_type: 'refresh_token',
		refresh_token: refreshToken
	});
	return normalizeTokens(await requestTokens(params), refreshToken);
}
