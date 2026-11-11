import { createHash } from 'node:crypto';

export function sha256Base64Url(value: string): string {
	return createHash('sha256').update(value).digest('base64url');
}

export function createPkceChallenge(verifier: string): string {
	return sha256Base64Url(verifier);
}

/**
 * Where an authorization server's sign-in page sends the browser back to: the
 * host the browser left from, so the flow cookie and the session it opens are
 * on the same host.
 */
export function browserRedirectUri(requestOrigin: string): string {
	return `${new URL(requestOrigin).origin}/z/oauth/callback`;
}

/** An authorization-code request (RFC 6749 §4.1.1) with PKCE S256. */
export function buildAuthorizationUrl(input: {
	authorizationEndpoint: string;
	clientId: string;
	redirectUri: string;
	scopes: readonly string[];
	state: string;
	codeVerifier: string;
}): string {
	const url = new URL(input.authorizationEndpoint);
	url.search = new URLSearchParams({
		response_type: 'code',
		client_id: input.clientId,
		redirect_uri: input.redirectUri,
		scope: input.scopes.join(' '),
		state: input.state,
		code_challenge: createPkceChallenge(input.codeVerifier),
		code_challenge_method: 'S256'
	}).toString();
	return url.toString();
}
