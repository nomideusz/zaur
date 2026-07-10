import type { RequestHandler } from './$types';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';
import {
	assertSameOriginJson,
	requireSecurityAccount,
	securityJson
} from '$lib/server/security-request';
import { performStepUp } from '$lib/server/step-up';
import { rotateSessionId } from '$lib/server/session';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	assertSameOriginJson(request, url);
	const account = requireSecurityAccount(cookies, request);
	const limit = checkRateLimit({
		key: `reauth:${account.id}:${getClientAddress(request)}`,
		limit: 10,
		windowMs: 15 * 60_000
	});
	if (!limit.allowed) {
		return securityJson(
			{ error: `Too many attempts. Try again in ${limit.retryAfterSec}s.` },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
		);
	}

	const body = (await request.json().catch(() => ({}))) as { password?: string; totp?: string };
	if (!body.password) return securityJson({ error: 'Password is required' }, { status: 400 });

	const result = await performStepUp({
		account,
		password: body.password,
		totp: body.totp,
		requestOrigin: url.origin
	});
	if (result === 'mfa_required') return securityJson({ requiresTotp: true }, { status: 202 });
	if (result === 'failure') {
		return securityJson({ error: 'Invalid password or authentication code' }, { status: 401 });
	}
	rotateSessionId(cookies);
	return securityJson({ verified: true });
};
