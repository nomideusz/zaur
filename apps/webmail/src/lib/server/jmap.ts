import { env } from '$env/dynamic/private';
import { JMAPClient } from '$lib/jmap/client';
import type { Cookies } from '@sveltejs/kit';
import type { SessionData } from './session';
import { accountKey, readAccountsById, updateAccountTokens } from './session';
import { OauthTokenError, refreshOauthTokens } from './oauth-token';

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
			if (latest?.accessToken && latest.refreshToken !== session.refreshToken && !shouldRefresh(latest)) {
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
			if (next.id) updateAccountTokens(next.id, next);
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

export async function createConnectedClient(
	session: SessionData,
	_cookies?: Cookies
): Promise<JMAPClient> {
	// Server-side JMAP goes straight to Stalwart on the docker network when set
	// (JMAP_INTERNAL_URL=http://mail:8080) — long-lived event streams through the
	// public Traefik route get cut and spam reconnect 502s. Browser clients keep
	// using the public URL; JMAPClient rewrites session URLs onto this origin.
	const serverUrl = env.JMAP_INTERNAL_URL || session.serverUrl;
	if (!isOauthSession(session)) {
		const client = new JMAPClient(serverUrl, session.username, session.password ?? '');
		await client.connect();
		return client;
	}

	let current = shouldRefresh(session) ? await refreshSession(session) : session;
	if (!current.accessToken) current = await refreshSession(current);
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
