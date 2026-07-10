import type { RequestHandler } from './$types';
import { revokeCredential } from '$lib/server/account-security';
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
	try {
		await revokeCredential(account, 'AppPassword', params.id);
		return securityJson({ revoked: true });
	} catch {
		return securityJson({ error: 'Could not revoke app password' }, { status: 400 });
	}
};
