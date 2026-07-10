import type { RequestHandler } from './$types';
import { getAccountSecurityOverview } from '$lib/server/account-security';
import { listAccountSessions } from '$lib/server/session';
import { requireSecurityAccount, securityJson } from '$lib/server/security-request';

export const GET: RequestHandler = async ({ request, cookies }) => {
	const account = requireSecurityAccount(cookies, request);
	try {
		const overview = await getAccountSecurityOverview(account);
		return securityJson({ ...overview, sessions: listAccountSessions(cookies) });
	} catch {
		return securityJson({ error: 'Could not load account security settings' }, { status: 502 });
	}
};
