import { env } from '$env/dynamic/private';
import { getOidcDiscovery } from '$lib/server/oidc-discovery';

export interface TokenResponse {
	access_token: string;
	refresh_token: string;
	id_token?: string;
	expires_in: number;
}

function getOauthResource(): string | undefined {
	return env.OAUTH_RESOURCE?.trim() || undefined;
}

function appendResourceParam(params: URLSearchParams) {
	const resource = getOauthResource();
	if (resource) {
		params.append('resource', resource);
	}
}

export function decodeJwt(token: string): any {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return null;
		const payload = parts[1];
		const decoded = Buffer.from(payload, 'base64url').toString('utf8');
		return JSON.parse(decoded);
	} catch {
		return null;
	}
}

export async function exchangeCodeForTokens(
	code: string,
	codeVerifier: string,
	redirectUri: string
): Promise<TokenResponse> {
	const clientId = env.OAUTH_CLIENT_ID || 'webmail';
	const { token_endpoint: tokenUrl } = await getOidcDiscovery();

	const params = new URLSearchParams();
	params.append('grant_type', 'authorization_code');
	params.append('client_id', clientId);
	params.append('code', code);
	params.append('redirect_uri', redirectUri);
	params.append('code_verifier', codeVerifier);
	appendResourceParam(params);

	const clientSecret = env.OAUTH_CLIENT_SECRET?.trim();
	const headers: Record<string, string> = {
		'Content-Type': 'application/x-www-form-urlencoded'
	};
	// Logto "Traditional web" apps require client authentication at the token endpoint.
	if (clientSecret) {
		headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
	}

	const response = await fetch(tokenUrl, {
		method: 'POST',
		headers,
		body: params.toString()
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`OAuth token exchange failed (${response.status}): ${errText}`);
	}

	return (await response.json()) as TokenResponse;
}

export async function refreshAccessToken(
	refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
	const clientId = env.OAUTH_CLIENT_ID || 'webmail';
	let tokenUrl: string;

	try {
		({ token_endpoint: tokenUrl } = await getOidcDiscovery());
	} catch {
		return null;
	}

	const params = new URLSearchParams();
	params.append('grant_type', 'refresh_token');
	params.append('client_id', clientId);
	params.append('refresh_token', refreshToken);
	appendResourceParam(params);

	const clientSecret = env.OAUTH_CLIENT_SECRET?.trim();
	const headers: Record<string, string> = {
		'Content-Type': 'application/x-www-form-urlencoded'
	};
	if (clientSecret) {
		headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
	}

	try {
		const response = await fetch(tokenUrl, {
			method: 'POST',
			headers,
			body: params.toString()
		});

		if (!response.ok) {
			console.error('Failed to refresh token:', response.status, await response.text());
			return null;
		}

		const data = await response.json();
		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token || refreshToken
		};
	} catch (error) {
		console.error('Error refreshing token:', error);
		return null;
	}
}

export async function buildAuthorizationUrl(input: {
	redirectUri: string;
	state: string;
	codeChallenge: string;
	loginHint?: string;
}): Promise<string> {
	const clientId = env.OAUTH_CLIENT_ID || 'webmail';
	const { authorization_endpoint: authorizationEndpoint } = await getOidcDiscovery();

	const params = new URLSearchParams();
	params.append('response_type', 'code');
	params.append('client_id', clientId);
	params.append('redirect_uri', input.redirectUri);
	params.append('scope', env.OAUTH_SCOPES?.trim() || 'openid profile email offline_access');
	params.append('state', input.state);
	params.append('code_challenge', input.codeChallenge);
	params.append('code_challenge_method', 'S256');
	appendResourceParam(params);

	if (input.loginHint?.trim()) {
		params.append('login_hint', input.loginHint.trim());
	}

	return `${authorizationEndpoint}?${params.toString()}`;
}
