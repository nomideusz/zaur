import { query, getRequestEvent } from '$app/server';
import { getActiveAccount, readSessionFull } from '@zaur/server-auth';

/**
 * Who is signed in — reads the session cookie through @zaur/server-auth.
 * Sessions are created by Mail 2.0's own login (login.remote.ts); the same
 * store/cookie is shared with webmail 1.0, so a 1.0 login also works here
 * and vice versa.
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
