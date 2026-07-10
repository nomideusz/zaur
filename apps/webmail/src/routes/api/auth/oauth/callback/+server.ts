import { redirect, type RequestHandler } from '@sveltejs/kit';
import { findIdentityEmail } from '$lib/jmap/account';
import { JMAPClient } from '$lib/jmap/client';
import { getStalwartOauthIssuer } from '$lib/server/oauth-config';
import { consumeOauthFlow } from '$lib/server/oauth-flow';
import { exchangeOauthCode } from '$lib/server/oauth-token';
import { addAccount, readSessionFull, writeSession, type SessionData } from '$lib/server/session';

const MAIL_SCOPE = 'urn:ietf:params:oauth:scope:mail';

function loginError(code: string): string {
	return `/login?error=${encodeURIComponent(code)}`;
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	const flow = consumeOauthFlow(cookies, url.searchParams.get('state'));
	if (!flow) redirect(303, loginError('oauth_state'));
	if (url.searchParams.has('error')) redirect(303, loginError('oauth_denied'));

	const code = url.searchParams.get('code');
	if (!code) redirect(303, loginError('oauth_code'));

	const issuer = getStalwartOauthIssuer();
	const returnedIssuer = url.searchParams.get('iss');
	if (returnedIssuer) {
		let issuerMatches = false;
		try {
			issuerMatches = new URL(returnedIssuer).origin === issuer;
		} catch {}
		if (!issuerMatches) redirect(303, loginError('oauth_issuer'));
	}

	if (flow.mode === 'add') {
		const current = readSessionFull(cookies);
		if (!current || current.id !== flow.originatingSessionId) {
			redirect(303, loginError('oauth_session'));
		}
	}

	let redirectTo: string;
	try {
		const tokens = await exchangeOauthCode({
			code,
			codeVerifier: flow.codeVerifier,
			redirectUri: flow.redirectUri
		});
		if (tokens.scope && !tokens.scope.split(/\s+/).includes(MAIL_SCOPE)) {
			throw new Error('Missing mail scope');
		}

		const client = new JMAPClient(issuer, '', tokens.accessToken, false, true);
		await client.connect();
		const username = client.getUsername().trim().toLowerCase();
		if (!username) throw new Error('Missing OAuth identity');
		const identities = await client.getIdentities();
		const primary = findIdentityEmail(identities, username) ?? identities[0];
		const data: SessionData = {
			serverUrl: issuer,
			username,
			displayName: primary?.name ?? primary?.email ?? username,
			authMethod: 'oauth',
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			accessTokenExpiresAt: tokens.accessTokenExpiresAt,
			scope: tokens.scope
		};

		if (flow.mode === 'add') {
			addAccount(cookies, data, { remember: flow.rememberMe });
		} else {
			writeSession(cookies, data, { remember: flow.rememberMe });
		}
		redirectTo = flow.redirectTo ?? '/';
	} catch {
		redirect(303, loginError('oauth_failed'));
	}
	redirect(303, redirectTo);
};
