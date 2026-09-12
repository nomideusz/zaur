import { query, getRequestEvent } from '$app/server';
import { getActiveAccount, readSessionFull } from '@zaur/server-auth';

/**
 * Who is signed in — reads the shared Zaur session cookie through
 * @zaur/server-auth, the same store webmail 1.0 writes. This is the seam that
 * lets Mail 2.0 piggyback on 1.0's login until it ships its own auth flows.
 */
export const whoami = query(async () => {
	const { cookies } = getRequestEvent();
	const session = readSessionFull(cookies);
	if (!session) return null;

	const current = getActiveAccount(session);
	if (!current) return null;

	return {
		sessionId: session.id,
		username: current.username,
		displayName: current.displayName ?? null,
		accounts: session.accounts.map((account) => ({
			username: account.username,
			authMethod: account.authMethod
		}))
	};
});
