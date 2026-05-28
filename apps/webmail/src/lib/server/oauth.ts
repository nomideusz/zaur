import { env } from '$env/dynamic/private';

export interface TokenResponse {
	access_token: string;
	refresh_token: string;
	id_token?: string;
	expires_in: number;
}

export function decodeJwt(token: string): any {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return null;
		const payload = parts[1];
		const decoded = Buffer.from(payload, 'base64url').toString('utf8');
		return JSON.parse(decoded);
	} catch (e) {
		console.error('Failed to decode JWT:', e);
		return null;
	}
}

export async function exchangeCodeForTokens(
	code: string,
	codeVerifier: string,
	redirectUri: string
): Promise<TokenResponse> {
	const clientId = env.OAUTH_CLIENT_ID || 'webmail';
	const issuerUrl = env.OAUTH_ISSUER_URL;
	if (!issuerUrl) {
		throw new Error('OAUTH_ISSUER_URL is not configured');
	}

	const params = new URLSearchParams();
	params.append('grant_type', 'authorization_code');
	params.append('client_id', clientId);
	params.append('code', code);
	params.append('redirect_uri', redirectUri);
	params.append('code_verifier', codeVerifier);

	const tokenUrl = `${issuerUrl.replace(/\/$/, '')}/protocol/openid-connect/token`;
	console.log(`Exchanging code at: ${tokenUrl}`);
	const response = await fetch(tokenUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: params.toString()
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`OAuth token exchange failed (${response.status}): ${errText}`);
	}

	return (await response.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
	const clientId = env.OAUTH_CLIENT_ID || 'webmail';
	const issuerUrl = env.OAUTH_ISSUER_URL;
	if (!issuerUrl) return null;

	const params = new URLSearchParams();
	params.append('grant_type', 'refresh_token');
	params.append('client_id', clientId);
	params.append('refresh_token', refreshToken);

	const tokenUrl = `${issuerUrl.replace(/\/$/, '')}/protocol/openid-connect/token`;
	try {
		const response = await fetch(tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
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
	} catch (e) {
		console.error('Error refreshing token:', e);
		return null;
	}
}
