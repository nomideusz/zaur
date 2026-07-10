import type { RequestHandler } from './$types';
import { revokeAccountSession } from '$lib/server/session';
import {
	assertSameOriginJson,
	requireSecurityAccount,
	securityJson
} from '$lib/server/security-request';
import { hasRecentStepUp } from '$lib/server/step-up';

export const DELETE: RequestHandler = async ({ request, cookies, url, params }) => {
	assertSameOriginJson(request, url);
	const account = requireSecurityAccount(cookies, request);
	if (!hasRecentStepUp(account)) return securityJson({ reauthRequired: true }, { status: 428 });
	const revoked = revokeAccountSession(cookies, params.id, account.username);
	return securityJson({ revoked, current: params.id === account.id });
};
