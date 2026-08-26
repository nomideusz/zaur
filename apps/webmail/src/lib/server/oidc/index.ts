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
import { getOrCreateKeypair, type OidcKeypair } from './core';

export interface OidcProviderClient {
	clientId: string;
	clientSecret: string;
	redirectUris: string[];
}

/** Null unless the provider is fully configured — routes 404 in that case. */
export function oidcProviderClient(): OidcProviderClient | null {
	const clientId = env.OIDC_PROVIDER_CLIENT_ID?.trim();
	const clientSecret = env.OIDC_PROVIDER_CLIENT_SECRET?.trim();
	const redirectUris = (env.OIDC_PROVIDER_REDIRECT_URIS ?? '')
		.split(',')
		.map((uri) => uri.trim())
		.filter(Boolean);
	if (!clientId || !clientSecret || redirectUris.length === 0) return null;
	return { clientId, clientSecret, redirectUris };
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
export async function resolveOidcIdentity(
	session: SessionData
): Promise<{ sub: string; preferred_username: string; email: string }> {
	const email = accountKey(session.username);
	if (session.authMethod !== 'oauth' && !session.accessToken) {
		return { sub: email, preferred_username: email, email };
	}

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
	const info = (await response.json()) as { sub?: unknown; preferred_username?: unknown; email?: unknown };
	const preferred = String(info.preferred_username ?? info.email ?? email);
	return {
		sub: String(info.sub ?? preferred),
		preferred_username: preferred,
		email: String(info.email ?? email)
	};
}
