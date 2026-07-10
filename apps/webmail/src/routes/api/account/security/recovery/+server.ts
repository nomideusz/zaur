import type { RequestHandler } from './$types';
import {
	getRecoveryEmail,
	requestRecoveryEmailChange
} from '$lib/server/recovery-service';
import {
	assertSameOriginJson,
	requireSecurityAccount,
	securityJson
} from '$lib/server/security-request';
import { hasRecentStepUp } from '$lib/server/step-up';
import { checkRateLimit } from '$lib/server/rate-limit';

export const GET: RequestHandler = async ({ request, cookies }) => {
	const account = requireSecurityAccount(cookies, request);
	try {
		return securityJson(await getRecoveryEmail(account.username));
	} catch {
		return securityJson({ recoveryEmail: null, unavailable: true });
	}
};

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	assertSameOriginJson(request, url);
	const account = requireSecurityAccount(cookies, request);
	if (!hasRecentStepUp(account)) return securityJson({ reauthRequired: true }, { status: 428 });
	const limit = checkRateLimit({
		key: `recovery-change:${account.username}`,
		limit: 3,
		windowMs: 60 * 60_000
	});
	if (!limit.allowed) {
		return securityJson({ error: 'Too many recovery email changes' }, { status: 429 });
	}
	const body = (await request.json().catch(() => ({}))) as { recoveryEmail?: string };
	const recoveryEmail = body.recoveryEmail?.trim().toLowerCase();
	if (!recoveryEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
		return securityJson({ error: 'A valid recovery email is required' }, { status: 400 });
	}
	try {
		await requestRecoveryEmailChange(account.username, recoveryEmail);
		return securityJson({ pending: true });
	} catch {
		return securityJson({ error: 'Could not send recovery verification' }, { status: 502 });
	}
};
