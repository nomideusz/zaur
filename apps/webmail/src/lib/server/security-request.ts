import { error, json, type Cookies } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import { resolveRequestAccount, type SessionData } from './session';
import { validateSameOriginJson } from './security-policy';
import { checkRateLimit, getClientAddress } from './rate-limit';

export function assertSameOriginJson(request: Request, url: URL): void {
	const failure = validateSameOriginJson(request, url.origin);
	if (failure === 'content_type') error(415, 'JSON request required');
	if (failure === 'origin') error(403, 'Cross-origin request rejected');
}

export function requireSecurityAccount(cookies: Cookies, request: Request): SessionData {
	const account = resolveRequestAccount(cookies, request);
	if (!account) error(401, 'Authentication required');
	if (account.authMethod !== 'oauth' || !account.accessToken) {
		error(409, 'Sign in again with secure authentication to manage account security');
	}
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		const accountHash = createHash('sha256')
			.update(account.username.toLowerCase())
			.digest('base64url')
			.slice(0, 20);
		const path = new URL(request.url).pathname;
		const limit = checkRateLimit({
			key: `security:${accountHash}:${getClientAddress(request)}:${request.method}:${path}`,
			limit: 20,
			windowMs: 15 * 60_000
		});
		if (!limit.allowed) error(429, 'Too many security requests');
	}
	return account;
}

export function securityJson(data: unknown, init?: { status?: number; headers?: HeadersInit }) {
	const headers = new Headers(init?.headers);
	headers.set('Cache-Control', 'no-store');
	headers.set('Pragma', 'no-cache');
	return json(data, { status: init?.status, headers });
}
