import { env } from '$env/dynamic/private';

export interface OidcDiscoveryDocument {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	userinfo_endpoint?: string;
	jwks_uri?: string;
}

export interface OauthClientConfig {
	enabled: boolean;
	passwordFallback?: boolean;
	passkeyEnabled?: boolean;
	passkeyOnly?: boolean;
	clientId?: string;
	issuerUrl?: string;
	authorizationEndpoint?: string;
	error?: string;
}

let cachedDiscovery: { issuerUrl: string; document: OidcDiscoveryDocument; fetchedAt: number } | null =
	null;

const CACHE_TTL_MS = 60 * 60 * 1000;

export function getOidcIssuerUrl(): string | undefined {
	return env.OAUTH_ISSUER_URL?.trim() || undefined;
}

export function isOauthEnabled(): boolean {
	return env.OAUTH_ENABLED === 'true' && Boolean(getOidcIssuerUrl());
}

/** Password sign-in via Stalwart (PostgreSQL SQL directory). Enabled by default when OAuth is on; set OAUTH_PASSWORD_FALLBACK=false for passkey-only. */
export function isPasswordLoginEnabled(): boolean {
	return env.OAUTH_PASSWORD_FALLBACK !== 'false';
}

/**
 * Client-safe sign-in configuration, shared by /api/auth/config and the SSR loads of the
 * sign-in pages. Never throws: a failed discovery degrades to password sign-in.
 */
export async function getOauthClientConfig(): Promise<OauthClientConfig> {
	if (!isOauthEnabled()) {
		return { enabled: false, passwordFallback: true };
	}

	try {
		const discovery = await getOidcDiscovery();
		const passwordFallback = isPasswordLoginEnabled();
		return {
			enabled: true,
			passwordFallback,
			passkeyEnabled: true,
			passkeyOnly: !passwordFallback,
			clientId: env.OAUTH_CLIENT_ID || 'webmail',
			issuerUrl: discovery.issuer,
			authorizationEndpoint: discovery.authorization_endpoint
		};
	} catch (err) {
		console.error('[auth/config] OIDC discovery failed:', err);
		return {
			enabled: false,
			passwordFallback: true,
			error: 'Identity provider is unavailable'
		};
	}
}

export async function getOidcDiscovery(forceRefresh = false): Promise<OidcDiscoveryDocument> {
	const issuerUrl = getOidcIssuerUrl();
	if (!issuerUrl) {
		throw new Error('OAUTH_ISSUER_URL is not configured');
	}

	const normalizedIssuer = issuerUrl.replace(/\/$/, '');
	const now = Date.now();
	if (
		!forceRefresh &&
		cachedDiscovery &&
		cachedDiscovery.issuerUrl === normalizedIssuer &&
		now - cachedDiscovery.fetchedAt < CACHE_TTL_MS
	) {
		return cachedDiscovery.document;
	}

	const discoveryUrl = `${normalizedIssuer}/.well-known/openid-configuration`;
	// Cap the upstream call so /api/auth/config can't hang the sign-in screen when the
	// identity provider is slow or unreachable.
	const response = await fetch(discoveryUrl, {
		headers: { Accept: 'application/json' },
		signal: AbortSignal.timeout(5000)
	});

	if (!response.ok) {
		throw new Error(`OIDC discovery failed (${response.status}) for ${discoveryUrl}`);
	}

	const document = (await response.json()) as OidcDiscoveryDocument;
	if (!document.authorization_endpoint || !document.token_endpoint) {
		throw new Error('OIDC discovery document is missing required endpoints');
	}

	cachedDiscovery = {
		issuerUrl: normalizedIssuer,
		document,
		fetchedAt: now
	};

	return document;
}
