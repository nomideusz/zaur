import { json, type RequestHandler } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { findIdentityEmail } from '$lib/jmap/account';
import { accountKey, clearSession, getActiveAccount, readSessionFull } from '$lib/server/session';

export const GET: RequestHandler = async ({ cookies }) => {
	const session = readSessionFull(cookies);
	const active = session ? getActiveAccount(session) : undefined;
	if (!session || !active) {
		// 200 (not 401): this endpoint is a session probe, not an auth challenge.
		return json({ authenticated: false });
	}

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

		const accounts = session.accounts.map((acct) => {
			const isActive = accountKey(acct.username) === session.activeKey;
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
			activeKey: session.activeKey,
			accounts
		});
	} catch {
		clearSession(cookies);
		return json({ authenticated: false });
	}
};
