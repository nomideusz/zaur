/**
 * Mail as an OIDC issuer for our own apps (Bartube, ytzero): signing into mail
 * signs you into them. The protocol core is shared with webmail 1.0
 * (`@zaur/server-auth/oidc`), and so is the store: the signing key and the
 * one-time codes live in the same `oidc_*` tables, so the issuer's JWKS does
 * not change when mail.zaur.app moves from webmail to mail2. Claims pass
 * Stalwart's userinfo through, keeping subjects identical to Stalwart's own.
 */
import { accountKey, getStalwartOauthIssuer, getStoreDb, type SessionData } from '@zaur/server-auth';
import {
	getOrCreateKeypair,
	parseOidcClients,
	type AuthCodeData,
	type OidcClient,
	type OidcKeypair
} from '@zaur/server-auth/oidc';
import { getFreshOauthSession } from '#lib/server/jmap';
import { getAccountProfile } from '#lib/server/recovery';

/** OIDC_PROVIDER_CLIENTS (JSON), plus the legacy single-client triple. None → the routes 404. */
export function oidcClients(): OidcClient[] {
	return parseOidcClients(process.env.OIDC_PROVIDER_CLIENTS, {
		clientId: process.env.OIDC_PROVIDER_CLIENT_ID,
		clientSecret: process.env.OIDC_PROVIDER_CLIENT_SECRET,
		redirectUris: process.env.OIDC_PROVIDER_REDIRECT_URIS,
		name: process.env.OIDC_PROVIDER_CLIENT_NAME
	});
}

export function findOidcClient(clientId: string | null | undefined): OidcClient | undefined {
	return clientId ? oidcClients().find((c) => c.clientId === clientId) : undefined;
}

/** The client a URL belongs to (same origin as one of its redirect_uris), for "Back to <app>". */
export function findOidcClientByOrigin(url: string): OidcClient | undefined {
	const origin = URL.parse(url)?.origin;
	return origin ? oidcClients().find((c) => c.redirectUris.some((uri) => URL.parse(uri)?.origin === origin)) : undefined;
}

export const allOidcRedirectUris = () => oidcClients().flatMap((c) => c.redirectUris);

let keypair: OidcKeypair | undefined;
export function oidcKeypair(): OidcKeypair {
	keypair ??= getOrCreateKeypair(getStoreDb());
	return keypair;
}

let userinfo: { fetchedAt: number; endpoint: string } | undefined;
async function userinfoEndpoint(): Promise<string> {
	if (userinfo && Date.now() - userinfo.fetchedAt < 60 * 60_000) return userinfo.endpoint;
	const issuer = getStalwartOauthIssuer();
	const response = await fetch(`${issuer}/.well-known/openid-configuration`, {
		headers: { Accept: 'application/json' },
		signal: AbortSignal.timeout(10_000)
	});
	if (!response.ok) throw new Error(`Stalwart OIDC discovery failed (${response.status})`);
	const endpoint = ((await response.json()) as { userinfo_endpoint?: string }).userinfo_endpoint;
	if (!endpoint || URL.parse(endpoint)?.origin !== issuer) {
		throw new Error('Stalwart OIDC discovery returned no usable userinfo_endpoint');
	}
	userinfo = { fetchedAt: Date.now(), endpoint };
	return endpoint;
}

/**
 * The claims to assert for the signed-in account. OAuth sessions ask
 * Stalwart's userinfo (refreshing a stale token once); password sessions use
 * the session address, which is what userinfo reports as preferred_username
 * anyway. name and groups (Stalwart roles, for admin-by-group in the apps)
 * come from register's account profile when it answers; if it does not, the
 * claims get thinner and the sign-in still goes through. A throw here means
 * the tokens are past refreshing: sign in again.
 */
export async function resolveOidcClaims(account: SessionData): Promise<AuthCodeData['claims']> {
	const email = accountKey(account.username);
	// The default identity's name is the address itself — that's not a name.
	const displayName = account.displayName?.trim();
	const claims: AuthCodeData['claims'] = {
		sub: email,
		preferred_username: email,
		email,
		name: displayName && displayName.toLowerCase() !== email ? displayName : email.split('@')[0]
	};

	if (account.authMethod === 'oauth' || account.accessToken) {
		const endpoint = await userinfoEndpoint();
		const ask = (token: string) =>
			fetch(endpoint, {
				headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
				signal: AbortSignal.timeout(10_000)
			});
		let current = await getFreshOauthSession(account);
		let response = await ask(current.accessToken!);
		if (response.status === 401) {
			current = await getFreshOauthSession(current, true);
			response = await ask(current.accessToken!);
		}
		if (!response.ok) throw new Error(`Stalwart userinfo failed (${response.status})`);
		const info = (await response.json()) as Record<string, unknown>;
		claims.preferred_username = String(info.preferred_username ?? info.email ?? email);
		claims.sub = String(info.sub ?? claims.preferred_username);
		claims.email = String(info.email ?? email);
		if (typeof info.name === 'string' && info.name.trim()) claims.name = info.name.trim();
	}

	try {
		const profile = await getAccountProfile(email);
		if (typeof profile.name === 'string' && profile.name.trim()) claims.name = profile.name.trim();
		if (Array.isArray(profile.roles)) claims.groups = profile.roles.filter((r): r is string => typeof r === 'string');
	} catch (error) {
		console.warn('[oidc] account profile lookup failed', email, error);
	}
	return claims;
}
