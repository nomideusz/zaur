import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { normalizeEmail } from '$lib/jmap/account';
import { buildSessionFromCredentials } from '$lib/server/login-session';
import {
	HANDOFF_TTL_MS,
	safeNextPath,
	verifyInternalSignature,
	type HandoffPayload
} from '$lib/server/internal-auth';
import { createOneTimeCode } from '$lib/server/oidc/core';
import { sealSession } from '$lib/server/session';
import { getStoreDb } from '$lib/server/store-instance';
import { log } from '$lib/server/log';

/*
 * Signup handoff. Register calls this (signed with the shared secret) right
 * after creating the account, so the new user lands in mail already signed in
 * instead of retyping the password. We authenticate exactly like /api/auth/login
 * and park the resulting session behind a one-time claim URL; the browser
 * follows it (see /auth/claim) and gets the cookie. The password never touches
 * the browser again and is not stored: only the sealed session is.
 */
export const POST: RequestHandler = async ({ request, url }) => {
	const body = await request.text();
	const ok = verifyInternalSignature({
		secret: env.REGISTER_INTERNAL_SECRET,
		timestamp: request.headers.get('x-zaur-timestamp') ?? '',
		nonce: request.headers.get('x-zaur-nonce') ?? '',
		method: request.method,
		pathWithQuery: `${url.pathname}${url.search}`,
		body,
		signature: request.headers.get('x-zaur-signature') ?? ''
	});
	if (!ok) return json({ error: 'Unauthorized' }, { status: 401 });

	let parsed: { email?: unknown; password?: unknown; next?: unknown };
	try {
		parsed = JSON.parse(body);
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
	const email = normalizeEmail(typeof parsed.email === 'string' ? parsed.email : '');
	const password = typeof parsed.password === 'string' ? parsed.password : '';
	if (!email || !password) return json({ error: 'email and password required' }, { status: 400 });

	const built = await buildSessionFromCredentials({ email, password, requestOrigin: url.origin });
	if (built.status !== 'ok') {
		log.warn('handoff_auth_failed', { username: email, status: built.status });
		return json({ error: built.status }, { status: built.status === 'unavailable' ? 503 : 401 });
	}

	const payload: HandoffPayload = { sealed: sealSession(built.sessionData), next: safeNextPath(parsed.next) };
	const token = createOneTimeCode(getStoreDb(), payload, HANDOFF_TTL_MS);
	return json(
		{ claimUrl: `${url.origin}/auth/claim?token=${encodeURIComponent(token)}` },
		{ headers: { 'Cache-Control': 'no-store' } }
	);
};
