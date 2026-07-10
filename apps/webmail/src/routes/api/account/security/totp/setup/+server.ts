import type { RequestHandler } from './$types';
import { beginTotpSetup } from '$lib/server/account-security';
import {
	assertSameOriginJson,
	requireSecurityAccount,
	securityJson
} from '$lib/server/security-request';
import { hasRecentStepUp } from '$lib/server/step-up';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	assertSameOriginJson(request, url);
	const account = requireSecurityAccount(cookies, request);
	if (!hasRecentStepUp(account)) return securityJson({ reauthRequired: true }, { status: 428 });
	try {
		return securityJson(beginTotpSetup(account));
	} catch {
		return securityJson({ error: 'Could not start two-factor setup' }, { status: 502 });
	}
};
