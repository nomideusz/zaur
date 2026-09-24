/**
 * Mail 2.0's own sign-in: turn credentials into a server-side session without
 * going through webmail 1.0. Mirrors webmail's /api/auth/login +
 * buildSessionFromCredentials, using the same @zaur/server-auth primitives so
 * session records are shaped identically (and session sharing keeps working
 * as a fallback for apps that still need it).
 *
 * Flow (matches the production config of webmail): when Stalwart OAuth is
 * configured, credentials authenticate through Stalwart's auth endpoint
 * (PKCE'd, server-side code exchange) and the session stores tokens — never
 * the password. Otherwise the password-login fallback signs in via HTTP Basic
 * to the JMAP server and seals the password in the store.
 */
import { createHash } from 'node:crypto';
import {
	authenticateStalwartCredentials,
	checkRateLimitRow,
	getStoreDb,
	isPasswordLoginEnabled,
	isStalwartOauthEnabled,
	StalwartAuthError,
	type SessionData
} from '@zaur/server-auth';
import {
	classifyJmapError,
	createTokenSession,
	findIdentityEmail
} from '@zaur/mail-core';
import { createConnectedClient } from '#lib/server/jmap';
import { reportError } from '#lib/server/report';

/** Public JMAP server — stored in the session; JMAP_INTERNAL_URL overrides it per-request. */
export function jmapServerUrl(): string {
	return process.env.PUBLIC_JMAP_SERVER_URL?.trim() || 'https://mail.zaur.app';
}

/**
 * The client address behind Dokploy's Traefik: it APPENDS the real client IP
 * as the last X-Forwarded-For entry, so the trusted address is the Nth from
 * the right (N = TRUSTED_PROXY_HOPS). Taking [0] trusts a client-supplied
 * value → rate-limit bypass. Set TRUSTED_PROXY_HOPS=2 if a CDN is fronted.
 */
export function getClientAddress(request: Request): string {
	const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
	const chain = request.headers
		.get('x-forwarded-for')
		?.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	if (chain?.length) {
		return chain[Math.max(0, chain.length - hops)];
	}
	return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export interface RateLimitResult {
	allowed: boolean;
	retryAfterSec: number;
}

/**
 * Fixed-window rate limits backed by the server SQLite store (shared with the
 * session store), so counters survive restarts. Same budgets as webmail's
 * login endpoint: 10 attempts per address and 20 per account per 15 minutes.
 */
export function checkLoginRateLimits(clientAddress: string, email: string): RateLimitResult {
	const ip = checkRateLimitRow(
		getStoreDb(),
		`mail2-password-login:${clientAddress}`,
		10,
		15 * 60 * 1000
	);
	if (!ip.allowed) return ip;
	const emailKey = createHash('sha256')
		.update(email.trim().toLowerCase())
		.digest('base64url')
		.slice(0, 24);
	return checkRateLimitRow(
		getStoreDb(),
		`mail2-password-login-account:${emailKey}`,
		20,
		15 * 60 * 1000
	);
}

export type LoginAttempt =
	| { status: 'ok'; sessionData: SessionData }
	| { status: 'mfa_required' }
	| { status: 'invalid_credentials' }
	| { status: 'unavailable' }
	| { status: 'error' };

export async function attemptLogin(input: {
	email: string;
	password: string;
	totp?: string;
	remember: boolean;
	requestOrigin: string;
	clientAddress: string;
	userAgent: string | null;
}): Promise<LoginAttempt> {
	const email = input.email.trim().toLowerCase();
	const serverUrl = jmapServerUrl();

	let sessionData: SessionData;
	if (isStalwartOauthEnabled()) {
		let authResult;
		try {
			authResult = await authenticateStalwartCredentials({
				accountName: email,
				accountSecret: input.password,
				mfaToken: input.totp,
				requestOrigin: input.requestOrigin
			});
		} catch (error) {
			// A wrong password is a `failure` result, not a throw — anything here is ours.
			reportError(error, { where: 'login: Stalwart credential flow' });
			if (error instanceof StalwartAuthError) return { status: 'unavailable' };
			return { status: 'error' };
		}
		if (authResult.status === 'mfa_required') return { status: 'mfa_required' };
		if (authResult.status === 'failure') return { status: 'invalid_credentials' };
		sessionData = createTokenSession({
			serverUrl,
			username: email,
			accessToken: authResult.tokens.accessToken,
			refreshToken: authResult.tokens.refreshToken,
			accessTokenExpiresAt: authResult.tokens.accessTokenExpiresAt,
			scope: authResult.tokens.scope
		});
	} else if (isPasswordLoginEnabled()) {
		const totp = input.totp?.trim();
		sessionData = {
			serverUrl,
			username: email,
			authMethod: 'password',
			password: totp ? `${input.password}$${totp}` : input.password
		};
	} else {
		return { status: 'unavailable' };
	}

	// Verify the session actually opens a JMAP session and pick a display name
	// from the account's identities — same as webmail's login.
	try {
		const client = await createConnectedClient(sessionData);
		const identities = await client.getIdentities();
		const primary = findIdentityEmail(identities, email) ?? identities[0];
		sessionData.displayName = primary?.name || primary?.email || email;
	} catch (error) {
		if (classifyJmapError(error) === 'invalid_credentials') {
			return { status: 'invalid_credentials' };
		}
		console.error('[Mail2 Login] JMAP session verification failed:', error);
		reportError(error, { where: 'login: JMAP session check' });
		return { status: 'unavailable' };
	}

	return { status: 'ok', sessionData };
}

/** Only same-app relative paths may be used as a post-login redirect target. */
export function safeNext(raw: string | null | undefined): string {
	if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
	return '/';
}
