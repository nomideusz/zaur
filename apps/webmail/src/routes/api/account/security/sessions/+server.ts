import type { RequestHandler } from './$types';
import {
	listAccountSessions,
	revokeOtherAccountSessions
} from '$lib/server/session';
import {
	assertSameOriginJson,
	requireSecurityAccount,
	securityJson
} from '$lib/server/security-request';
import { hasRecentStepUp } from '$lib/server/step-up';

export const GET: RequestHandler = async ({ request, cookies }) => {
	requireSecurityAccount(cookies, request);
	return securityJson({ sessions: listAccountSessions(cookies) });
};

export const DELETE: RequestHandler = async ({ request, cookies, url }) => {
	assertSameOriginJson(request, url);
	const account = requireSecurityAccount(cookies, request);
	if (!hasRecentStepUp(account)) return securityJson({ reauthRequired: true }, { status: 428 });
	const revoked = revokeOtherAccountSessions(cookies, account.username);
	return securityJson({ revoked });
};
