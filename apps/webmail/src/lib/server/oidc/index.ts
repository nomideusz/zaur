/**
 * OIDC provider wiring: env-driven client registry and the Stalwart identity
 * lookup. Webmail acts as an OIDC issuer for our own apps (ytzero/bartube),
 * so signing into webmail signs you into them — identity claims are passed
 * through verbatim from Stalwart's userinfo, keeping subjects identical to
 * what Stalwart's own OIDC issuer emits (`preferred_username` = full email,
 * unique across all hosted domains).
 */
import { env } from '$env/dynamic/private';
import { accountKey, type SessionData } from '$lib/server/session';
import { getFreshOauthSession } from '$lib/server/jmap';
import { getStalwartOauthIssuer } from '$lib/server/oauth-config';
import { getStoreDb } from '$lib/server/store-instance';
import { getAccountProfile } from '$lib/server/recovery-service';
import { log } from '$lib/server/log';
import { getOrCreateKeypair, parseOidcClients, type OidcClient, type OidcKeypair } from './core';

export type OidcProviderClient = OidcClient;

export function oidcProviderClients(): OidcClient[] {
	return parseOidcClients(env.OIDC_PROVIDER_CLIENTS, {
		clientId: env.OIDC_PROVIDER_CLIENT_ID,
		clientSecret: env.OIDC_PROVIDER_CLIENT_SECRET,
		redirectUris: env.OIDC_PROVIDER_REDIRECT_URIS,
		name: env.OIDC_PROVIDER_CLIENT_NAME
	});
}

/** False when no client is configured — the /oidc/* + discovery routes 404. */
export function oidcProviderEnabled(): boolean {
	return oidcProviderClients().length > 0;
}

export function findOidcClient(clientId: string | null | undefined): OidcClient | undefined {
	if (!clientId) return undefined;
	return oidcProviderClients().find((c) => c.clientId === clientId);
}

/** Every registered redirect_uri, for post-logout origin checks. */
export function allOidcRedirectUris(): string[] {
	return oidcProviderClients().flatMap((c) => c.redirectUris);
}

let cachedKeypair: OidcKeypair | undefined;
export function oidcKeypair(): OidcKeypair {
	cachedKeypair ??= getOrCreateKeypair(getStoreDb());
	return cachedKeypair;
}

const USERINFO_TTL_MS = 60 * 60_000;
let cachedUserinfoEndpoint: { fetchedAt: number; endpoint: string } | undefined;

async function stalwartUserinfoEndpoint(): Promise<string> {
	const now = Date.now();
	if (cachedUserinfoEndpoint && now - cachedUserinfoEndpoint.fetchedAt < USERINFO_TTL_MS) {
		return cachedUserinfoEndpoint.endpoint;
	}
	const issuer = getStalwartOauthIssuer();
	const response = await fetch(`${issuer}/.well-known/openid-configuration`, {
		headers: { Accept: 'application/json' },
		signal: AbortSignal.timeout(10_000)
	});
	if (!response.ok) throw new Error(`Stalwart OIDC discovery failed (${response.status})`);
	const document = (await response.json()) as { userinfo_endpoint?: string };
	const endpoint = document.userinfo_endpoint;
	if (!endpoint || new URL(endpoint).origin !== issuer) {
		throw new Error('Stalwart OIDC discovery returned no usable userinfo_endpoint');
	}
	cachedUserinfoEndpoint = { fetchedAt: now, endpoint };
	return endpoint;
}

/**
 * The identity claims to assert for a signed-in webmail session. OAuth
 * sessions ask Stalwart's userinfo (authoritative, refreshing a stale access
 * token once); legacy password sessions fall back to the session email, which
 * Stalwart's userinfo reports as `preferred_username` anyway.
 */
export interface OidcClaims {
	sub: string;
	preferred_username: string;
	email: string;
	name?: string;
	groups?: string[];
}

/**
 * name: Stalwart's principal description via userinfo, else the webmail
 * display name (default identity), else the local part. groups: Stalwart
 * roles (user/admin) fetched through register's signed internal API, so
 * relying parties can grant admin from a group claim. Both are best-effort —
 * a lookup failure degrades the claim, never the sign-in.
 */
export async function resolveOidcIdentity(session: SessionData): Promise<OidcClaims> {
	const email = accountKey(session.username);
	const fallbackName = session.displayName?.trim() || email.split('@')[0];
	const base: OidcClaims = { sub: email, preferred_username: email, email, name: fallbackName };

	if (session.authMethod === 'oauth' || session.accessToken) {
		const endpoint = await stalwartUserinfoEndpoint();
		const attempt = async (accessToken: string) =>
			fetch(endpoint, {
				headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
				signal: AbortSignal.timeout(10_000)
			});

		let current = await getFreshOauthSession(session);
		let response = await attempt(current.accessToken!);
		if (response.status === 401) {
			current = await getFreshOauthSession(current, true);
			response = await attempt(current.accessToken!);
		}
		if (!response.ok) throw new Error(`Stalwart userinfo failed (${response.status})`);
		const info = (await response.json()) as {
			sub?: unknown;
			preferred_username?: unknown;
			email?: unknown;
			name?: unknown;
		};
		const preferred = String(info.preferred_username ?? info.email ?? email);
		base.sub = String(info.sub ?? preferred);
		base.preferred_username = preferred;
		base.email = String(info.email ?? email);
		if (typeof info.name === 'string' && info.name.trim()) base.name = info.name.trim();
	}

	try {
		const profile = await getAccountProfile(email);
		if (typeof profile.name === 'string' && profile.name.trim()) base.name = profile.name.trim();
		if (Array.isArray(profile.roles)) base.groups = profile.roles.filter((r): r is string => typeof r === 'string');
	} catch (err) {
		log.warn('oidc_profile_lookup_failed', { username: email }, err);
	}
	return base;
}
