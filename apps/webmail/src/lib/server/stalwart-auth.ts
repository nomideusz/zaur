import { randomBytes } from 'node:crypto';
import {
	getStalwartOauthClientId,
	getStalwartOauthDiscovery,
	getStalwartOauthIssuer,
	getStalwartOauthRedirectUri,
	getStalwartOauthScopes
} from './oauth-config';
import { exchangeOauthCode, type OauthTokens } from './oauth-token';
import { createPkceChallenge } from './oauth-utils';
import {
	createStalwartAuthPayload,
	describeStalwartAuthResponse,
	parseStalwartAuthResponse
} from './stalwart-auth-contract';
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

const MAIL_SCOPE = 'urn:ietf:params:oauth:scope:mail';

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
	if (tokens.scope && !tokens.scope.split(/\s+/).includes(MAIL_SCOPE)) {
		log.warn('stalwart_oauth_scope_not_echoed', {
			grantedScopes: tokens.scope.split(/\s+/).filter(Boolean).slice(0, 20)
		});
	}
	return { status: 'authenticated', tokens };
}
