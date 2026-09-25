import { json, type RequestHandler } from '@sveltejs/kit';
import { createOneTimeCode } from '@zaur/server-auth/oidc';
import { getStoreDb, sealSession } from '@zaur/server-auth';
import {
	HANDOFF_TTL_MS,
	safeNextPath,
	verifyInternalSignature,
	type HandoffPayload
} from '@zaur/server-auth/internal-auth';
import { attemptLogin } from '#lib/server/login';

/*
 * Signup handoff. Register calls this (signed with the shared secret) right
 * after creating the account, so the new person lands in mail signed in
 * instead of typing the password again. The session is built exactly like
 * /login's and parked behind a one-time claim URL (/auth/claim) that the
 * browser follows. The password is not kept: only the sealed session is.
 */
export const POST: RequestHandler = async ({ request, url }) => {
	const body = await request.text();
	const signed = verifyInternalSignature({
		secret: process.env.REGISTER_INTERNAL_SECRET,
		timestamp: request.headers.get('x-zaur-timestamp') ?? '',
		nonce: request.headers.get('x-zaur-nonce') ?? '',
		method: request.method,
		pathWithQuery: `${url.pathname}${url.search}`,
		body,
		signature: request.headers.get('x-zaur-signature') ?? ''
	});
	if (!signed) return json({ error: 'Unauthorized' }, { status: 401 });

	let parsed: { email?: unknown; password?: unknown; next?: unknown };
	try {
		parsed = JSON.parse(body);
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
	const email = typeof parsed.email === 'string' ? parsed.email.trim().toLowerCase() : '';
	const password = typeof parsed.password === 'string' ? parsed.password : '';
	if (!email || !password) return json({ error: 'email and password required' }, { status: 400 });

	const result = await attemptLogin({
		email,
		password,
		remember: false,
		requestOrigin: url.origin,
		clientAddress: 'register',
		userAgent: null
	});
	if (result.status !== 'ok') {
		console.warn('[handoff] sign-in failed', email, result.status);
		return json({ error: result.status }, { status: result.status === 'unavailable' ? 503 : 401 });
	}

	const payload: HandoffPayload = { sealed: sealSession(result.sessionData), next: safeNextPath(parsed.next) };
	const token = createOneTimeCode(getStoreDb(), payload, HANDOFF_TTL_MS);
	return json(
		{ claimUrl: `${url.origin}/auth/claim?token=${encodeURIComponent(token)}` },
		{ headers: { 'Cache-Control': 'no-store' } }
	);
};
