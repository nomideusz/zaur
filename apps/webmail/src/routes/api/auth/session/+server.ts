import { json, type RequestHandler } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { findIdentityEmail } from '$lib/jmap/account';
import { accountKey, getActiveAccount, readSessionFull, removeAccount } from '$lib/server/session';

/** A genuine auth failure (dead token) vs. a transient network/server error. */
function isAuthError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : '';
	return /unauthorized|invalid username|401/i.test(message);
}

export const GET: RequestHandler = async ({ cookies }) => {
	let session = readSessionFull(cookies);
	if (!session) {
		// 200 (not 401): this endpoint is a session probe, not an auth challenge.
		return json({ authenticated: false });
	}

	// Try the active account; if its token is dead, prune it and fall back to the
	// next account so one expired login does not sign the user out of the others.
	for (let guard = 0; guard < 16 && session; guard++) {
		const active = getActiveAccount(session);
		if (!active) break;

		try {
			// Connect only the active account — identities for inactive accounts are
			// fetched lazily when the user switches to them (keeps this a single hop).
			const client = await createConnectedClient({ ...active, id: session.id }, cookies);
			const identities = await client.getIdentities();
			const primary = findIdentityEmail(identities, active.username) ?? identities[0];
			const mappedIdentities = identities.map((identity) => ({
				id: identity.id,
				name: identity.name,
				email: identity.email,
				replyTo: identity.replyTo
			}));
			const activeDisplayName = primary?.name ?? primary?.email ?? active.username;

			const current = session;
			const accounts = current.accounts.map((acct) => {
				const isActive = accountKey(acct.username) === current.activeKey;
				return {
					key: accountKey(acct.username),
					username: acct.username,
					displayName: isActive ? activeDisplayName : (acct.displayName ?? acct.username),
					isActive,
					identities: isActive ? mappedIdentities : undefined
				};
			});

			return json({
				authenticated: true,
				// Back-compat: the active account at the top level (current client reads these).
				serverUrl: active.serverUrl,
				username: active.username,
				displayName: activeDisplayName,
				identities: mappedIdentities,
				// Multi-account.
				activeKey: current.activeKey,
				accounts
			});
		} catch (error) {
			if (!isAuthError(error)) {
				// Transient (network/5xx): don't prune — a later probe can retry.
				return json({ authenticated: false });
			}
			// Dead token — drop this account and try the next one.
			session = removeAccount(cookies, accountKey(active.username));
		}
	}

	return json({ authenticated: false });
};
