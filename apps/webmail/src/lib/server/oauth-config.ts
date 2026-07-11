import { env } from '$env/dynamic/private';

export interface StalwartOauthDiscovery {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	code_challenge_methods_supported?: string[];
	scopes_supported?: string[];
}

const DISCOVERY_TTL_MS = 60 * 60_000;
const DEFAULT_SCOPES = [
	'offline_access',
	'urn:ietf:params:oauth:scope:mail',
	'urn:ietf:params:oauth:scope:contacts',
	'urn:ietf:params:oauth:scope:calendars'
] as const;

let cached:
	| { issuer: string; fetchedAt: number; document: StalwartOauthDiscovery }
	| undefined;

function normalizeOrigin(value: string): string {
	return new URL(value).origin;
}

export function isStalwartOauthEnabled(): boolean {
	return (
		env.STALWART_OAUTH_ENABLED === 'true' &&
		Boolean(env.STALWART_OAUTH_CLIENT_ID?.trim()) &&
		Boolean(env.STALWART_OAUTH_ISSUER_URL?.trim())
	);
}

// Password sign-in (HTTP Basic to the JMAP server; the password is sealed in
// the server-side session). Tri-state on STALWART_PASSWORD_LOGIN_ROLLBACK_ENABLED:
//   - truthy → always on. Deliberately kept as the emergency lever to restore
//     password login if Stalwart OAuth breaks (see the 2026-06-30 license
//     incident) — do not remove with the next flag sweep. Note: while OAuth
//     stays *configured*, the login endpoint routes through OAuth first, so
//     restoring password login also needs STALWART_OAUTH_ENABLED unset/false.
//   - falsy → always off.
//   - unset → keys off DECLARED intent, not config completeness: on unless the
//     operator declared STALWART_OAUTH_ENABLED=true. This means a fresh
//     self-hosted deploy signs in out of the box without an OAuth client, while
//     a deployment that declares OAuth but loses one OAuth var still fails
//     CLOSED (503) instead of silently downgrading to password-in-session auth.
export function isPasswordLoginEnabled(): boolean {
	const explicit = parseBool(env.STALWART_PASSWORD_LOGIN_ROLLBACK_ENABLED);
	if (explicit !== undefined) return explicit;
	return env.STALWART_OAUTH_ENABLED?.trim().toLowerCase() !== 'true';
}

// Lenient boolean env parse: true/1/yes/on and false/0/no/off (case-insensitive);
// undefined for unset or unrecognized, so callers apply their own default.
function parseBool(raw: string | undefined): boolean | undefined {
	const v = raw?.trim().toLowerCase();
	if (v === undefined || v === '') return undefined;
	if (['true', '1', 'yes', 'on'].includes(v)) return true;
	if (['false', '0', 'no', 'off'].includes(v)) return false;
	return undefined;
}

export function getStalwartOauthClientId(): string {
	const clientId = env.STALWART_OAUTH_CLIENT_ID?.trim();
	if (!clientId) throw new Error('STALWART_OAUTH_CLIENT_ID is not configured');
	return clientId;
}

export function getStalwartOauthClientSecret(): string | undefined {
	return env.STALWART_OAUTH_CLIENT_SECRET?.trim() || undefined;
}

export function getStalwartOauthIssuer(): string {
	const issuer = env.STALWART_OAUTH_ISSUER_URL?.trim();
	if (!issuer) throw new Error('STALWART_OAUTH_ISSUER_URL is not configured');
	return normalizeOrigin(issuer);
}

export function getStalwartOauthRedirectUri(requestOrigin: string): string {
	const configured = env.STALWART_OAUTH_REDIRECT_URI?.trim();
	return configured || `${normalizeOrigin(requestOrigin)}/api/auth/oauth/callback`;
}

export function getStalwartOauthScopes(discovery?: StalwartOauthDiscovery): string[] {
	const configured = env.STALWART_OAUTH_SCOPES?.trim();
	const requested = configured ? configured.split(/\s+/).filter(Boolean) : [...DEFAULT_SCOPES];
	return discovery?.scopes_supported?.length
		? requested.filter((scope) => discovery.scopes_supported!.includes(scope))
		: requested;
}

export async function getStalwartOauthDiscovery(
	forceRefresh = false
): Promise<StalwartOauthDiscovery> {
	const issuer = getStalwartOauthIssuer();
	const now = Date.now();
	if (!forceRefresh && cached?.issuer === issuer && now - cached.fetchedAt < DISCOVERY_TTL_MS) {
		return cached.document;
	}

	const response = await fetch(`${issuer}/.well-known/oauth-authorization-server`, {
		headers: { Accept: 'application/json' },
		signal: AbortSignal.timeout(5000)
	});
	if (!response.ok) throw new Error(`Stalwart OAuth discovery failed (${response.status})`);

	const document = (await response.json()) as StalwartOauthDiscovery;
	if (
		normalizeOrigin(document.issuer) !== issuer ||
		!document.authorization_endpoint ||
		!document.token_endpoint
	) {
		throw new Error('Invalid Stalwart OAuth discovery document');
	}

	for (const endpoint of [document.authorization_endpoint, document.token_endpoint]) {
		const url = new URL(endpoint);
		if (url.origin !== issuer || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
			throw new Error('Stalwart OAuth endpoint origin mismatch');
		}
	}
	if (!document.code_challenge_methods_supported?.includes('S256')) {
		throw new Error('Stalwart OAuth server does not advertise PKCE S256');
	}

	cached = { issuer, fetchedAt: now, document };
	return document;
}
