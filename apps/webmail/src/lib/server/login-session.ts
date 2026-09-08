/**
 * Turn credentials into SessionData the way /api/auth/login does, so the
 * signup handoff (register → /api/internal/handoff) creates sessions that are
 * indistinguishable from a normal sign-in.
 */
import { appConfig } from '$lib/config';
import { createConnectedClient } from '$lib/server/jmap';
import { findIdentityEmail } from '$lib/jmap/account';
import { isPasswordLoginEnabled, isStalwartOauthEnabled } from '$lib/server/oauth-config';
import { authenticateStalwartCredentials } from '$lib/server/stalwart-auth';
import type { SessionData } from '$lib/server/session-model';
import { createTokenSession } from '@zaur/mail-core/auth/contract';

export type BuiltSession =
	| { status: 'ok'; sessionData: SessionData; identities: Awaited<ReturnType<Awaited<ReturnType<typeof createConnectedClient>>['getIdentities']>> }
	| { status: 'mfa_required' }
	| { status: 'invalid_credentials' }
	| { status: 'unavailable' };

export async function buildSessionFromCredentials(input: {
	email: string;
	password: string;
	totp?: string;
	requestOrigin: string;
}): Promise<BuiltSession> {
	const serverUrl = appConfig.jmapServerUrl;
	let sessionData: SessionData;
	if (isStalwartOauthEnabled()) {
		const authResult = await authenticateStalwartCredentials({
			accountName: input.email,
			accountSecret: input.password,
			mfaToken: input.totp,
			requestOrigin: input.requestOrigin
		});
		if (authResult.status === 'mfa_required') return { status: 'mfa_required' };
		if (authResult.status === 'failure') return { status: 'invalid_credentials' };
		sessionData = createTokenSession({
			serverUrl,
			username: input.email,
			accessToken: authResult.tokens.accessToken,
			refreshToken: authResult.tokens.refreshToken,
			accessTokenExpiresAt: authResult.tokens.accessTokenExpiresAt,
			scope: authResult.tokens.scope
		});
	} else if (isPasswordLoginEnabled()) {
		const totp = input.totp?.trim();
		sessionData = {
			serverUrl,
			username: input.email,
			authMethod: 'password' as const,
			password: totp ? `${input.password}$${totp}` : input.password
		};
	} else {
		return { status: 'unavailable' };
	}

	const client = await createConnectedClient(sessionData);
	const identities = await client.getIdentities();
	const primary = findIdentityEmail(identities, input.email) ?? identities[0];
	sessionData.displayName = primary?.name ?? primary?.email ?? input.email;
	return { status: 'ok', sessionData, identities };
}
