import { JMAPClient } from '@zaur/mail-core';
import {
	OauthTokenError,
	accountKey,
	readAccountsById,
	refreshOauthTokens,
	updateAccountTokens,
	type SessionData
} from '@zaur/server-auth';
import { reportError } from '#lib/server/report';

const REFRESH_SKEW_MS = 90_000;
const refreshes = new Map<string, Promise<SessionData>>();

function isOauthSession(session: SessionData): boolean {
	return session.authMethod === 'oauth' || (!session.password && Boolean(session.accessToken));
}

function refreshKey(session: SessionData): string {
	return `${session.id ?? 'no-session'}:${session.username.toLowerCase()}`;
}

async function refreshSession(session: SessionData): Promise<SessionData> {
	if (!session.refreshToken) throw new Error('Unauthorized');
	const key = refreshKey(session);
	const existing = refreshes.get(key);
	if (existing) return existing;

	const pending = (async () => {
		try {
			// A request may have captured the account before another request rotated
			// its refresh token. Re-read under the process lock and use the newest
			// persisted generation rather than replaying the stale token.
			const latest = session.id
				? readAccountsById(session.id).find(
						(account) => accountKey(account.username) === accountKey(session.username)
					)
				: undefined;
			if (
				latest?.accessToken &&
				latest.refreshToken !== session.refreshToken &&
				!shouldRefresh(latest)
			) {
				return latest;
			}
			const source = latest?.refreshToken ? latest : session;
			const tokens = await refreshOauthTokens(source.refreshToken!);
			const next: SessionData = {
				...source,
				authMethod: 'oauth',
				password: undefined,
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
				accessTokenExpiresAt: tokens.accessTokenExpiresAt,
				scope: tokens.scope ?? session.scope
			};
			if (next.id) {
				updateAccountTokens(next.id, next);
			} else {
				// Without the session id the rotated refresh token is lost, and the next
				// refresh fails with the old one: a silent sign-out. Take accounts from
				// #lib/server/account (or readAccountsById), which carry the id.
				const lost = new Error('Refreshed OAuth tokens for an account without a session id; not saved');
				console.error('[jmap]', lost.message, next.username);
				reportError(lost, { where: 'jmap token refresh' });
			}
			return next;
		} catch (error) {
			if (error instanceof OauthTokenError && error.code === 'invalid_grant') {
				throw new Error('Unauthorized');
			}
			throw error;
		}
	})();
	refreshes.set(key, pending);
	try {
		return await pending;
	} finally {
		if (refreshes.get(key) === pending) refreshes.delete(key);
	}
}

function shouldRefresh(session: SessionData): boolean {
	return Boolean(
		session.refreshToken &&
			session.accessTokenExpiresAt &&
			session.accessTokenExpiresAt - Date.now() <= REFRESH_SKEW_MS
	);
}

export async function getFreshOauthSession(
	session: SessionData,
	forceRefresh = false
): Promise<SessionData> {
	const latest = session.id
		? readAccountsById(session.id).find(
				(account) => accountKey(account.username) === accountKey(session.username)
			)
		: undefined;
	const current = latest ?? session;
	if (forceRefresh || shouldRefresh(current) || !current.accessToken) {
		return refreshSession(current);
	}
	return current;
}

/**
 * Server-side JMAP client for the given account. Goes straight to Stalwart on
 * the docker network when JMAP_INTERNAL_URL is set (long-lived streams through
 * the public route get cut); otherwise it uses the account's server URL.
 * OAuth tokens are refreshed proactively and on 401, persisted back into the
 * shared multi-account session store (same store webmail 1.0 writes).
 */
export async function createConnectedClient(account: SessionData): Promise<JMAPClient> {
	const serverUrl = process.env.JMAP_INTERNAL_URL || account.serverUrl;
	if (!isOauthSession(account)) {
		const client = new JMAPClient(serverUrl, account.username, account.password ?? '');
		await client.connect();
		return client;
	}

	let current = await getFreshOauthSession(account);
	const refreshAuth = async () => {
		current = await refreshSession(current);
		return current.accessToken ?? null;
	};
	const client = new JMAPClient(
		serverUrl,
		current.username,
		current.accessToken!,
		false,
		true,
		refreshAuth
	);
	await client.connect();
	return client;
}
