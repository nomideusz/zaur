/**
 * Step-up authentication for the security settings.
 *
 * Two different things need proving here, and they are kept apart:
 *
 * 1. **Stalwart's own check.** Changing the password or the TOTP state needs
 *    the current password in the same `x:AccountPassword/set` call. Those
 *    forms ask for it right there and pass it straight through; nothing is
 *    cached.
 * 2. **Our check**, for the actions Stalwart does not guard with a password —
 *    minting an app password, revoking a session. Those need a *recent* proof
 *    that the person at the keyboard knows the password. `confirmIdentity`
 *    re-authenticates against Stalwart, writes a five-minute proof into the
 *    shared store (`step_up_proofs`, keyed by session and account, so a
 *    borrowed 1.0 session gets the same treatment), and rotates the session
 *    id — a fresh id after a fresh proof is what stops a captured cookie from
 *    inheriting the window.
 *
 * Which Stalwart door the proof goes through depends on how this session was
 * made: an OAuth session runs the same PKCE credential flow as login (and
 * keeps the fresh tokens — the same call is what re-signs the session after a
 * password change); a password-fallback session opens a JMAP session with
 * the typed password over HTTP Basic.
 */
import { createHash } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import {
	StalwartAuthError,
	accountKey,
	authenticateStalwartCredentials,
	checkRateLimitRow,
	getStoreDb,
	hasStepUpProof,
	isStalwartOauthEnabled,
	putStepUpProof,
	rotateSessionId,
	updateAccountTokens,
	type SessionData
} from '@zaur/server-auth';
import { JMAPClient, classifyJmapError } from '@zaur/mail-core';
import { jmapServerUrl } from '#lib/server/login';

export const STEP_UP_TTL_MS = 5 * 60_000;

export type IdentityCheck = 'verified' | 'mfa_required' | 'failure' | 'unavailable';

export function isOauthAccount(account: SessionData): boolean {
	return account.authMethod === 'oauth' || (!account.password && Boolean(account.accessToken));
}

export function hasRecentStepUp(account: SessionData, now = Date.now()): boolean {
	return Boolean(
		account.id && hasStepUpProof(getStoreDb(), account.id, accountKey(account.username), now)
	);
}

/**
 * Check a password (and code) against Stalwart without touching the session.
 * Used by `confirmIdentity`, and by the password change to sign the session
 * back in once Stalwart has revoked every token it held.
 */
export async function checkCredentials(input: {
	account: SessionData;
	password: string;
	totp?: string;
	requestOrigin: string;
}): Promise<{ status: IdentityCheck; next?: SessionData }> {
	const { account } = input;
	const totp = input.totp?.replace(/\s+/g, '') || undefined;

	if (isOauthAccount(account) || isStalwartOauthEnabled()) {
		let result;
		try {
			result = await authenticateStalwartCredentials({
				accountName: account.username,
				accountSecret: input.password,
				mfaToken: totp,
				requestOrigin: input.requestOrigin
			});
		} catch (cause) {
			if (cause instanceof StalwartAuthError) return { status: 'unavailable' };
			throw cause;
		}
		if (result.status !== 'authenticated') return { status: result.status };
		return {
			status: 'verified',
			next: {
				...account,
				authMethod: 'oauth',
				password: undefined,
				accessToken: result.tokens.accessToken,
				refreshToken: result.tokens.refreshToken,
				accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
				scope: result.tokens.scope ?? account.scope
			}
		};
	}

	// Password fallback: the only way to ask Stalwart is to open a session.
	const secret = totp ? `${input.password}$${totp}` : input.password;
	try {
		const client = new JMAPClient(
			process.env.JMAP_INTERNAL_URL || account.serverUrl || jmapServerUrl(),
			account.username,
			secret
		);
		await client.connect();
	} catch (cause) {
		if (classifyJmapError(cause) === 'invalid_credentials') return { status: 'failure' };
		return { status: 'unavailable' };
	}
	return { status: 'verified', next: { ...account, authMethod: 'password', password: secret } };
}

/** Record a proof for this session and rotate its id. */
export function grantStepUp(cookies: Cookies, account: SessionData, next?: SessionData): void {
	if (!account.id) return;
	if (next) updateAccountTokens(account.id, next);
	const now = Date.now();
	putStepUpProof(getStoreDb(), account.id, accountKey(account.username), now, now + STEP_UP_TTL_MS);
	// rotateSessionId carries live proofs across to the new id.
	rotateSessionId(cookies);
}

/** Same 16-char hash webmail records for the device list. */
export function hashClientAddress(clientAddress: string): string {
	return createHash('sha256').update(clientAddress).digest('base64url').slice(0, 16);
}

/**
 * Store-backed fixed windows, so a restart does not reset an attacker's
 * budget. Identity checks get the login budget (they *are* a login); other
 * mutations get a looser one that only a script would ever hit.
 */
export function checkSecurityRateLimit(
	kind: 'identity' | 'mutation',
	account: SessionData,
	clientAddress: string
) {
	const key = `${accountKey(account.username)}:${hashClientAddress(clientAddress)}`;
	return kind === 'identity'
		? checkRateLimitRow(getStoreDb(), `mail2-security-identity:${key}`, 10, 15 * 60_000)
		: checkRateLimitRow(getStoreDb(), `mail2-security-mutation:${key}`, 30, 15 * 60_000);
}
