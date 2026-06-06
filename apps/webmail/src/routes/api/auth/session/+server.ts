import { json, type RequestHandler } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { findIdentityEmail } from '$lib/jmap/account';
import { clearSession, readSession } from '$lib/server/session';

export const GET: RequestHandler = async ({ cookies }) => {
	const session = readSession(cookies);
	if (!session) {
		// 200 (not 401): this endpoint is a session probe, not an auth challenge.
		return json({ authenticated: false });
	}

	try {
		const client = await createConnectedClient(session);
		const identities = await client.getIdentities();
		const primary =
			findIdentityEmail(identities, session.username) ?? identities[0];

		return json({
			authenticated: true,
			serverUrl: session.serverUrl,
			username: session.username,
			displayName: primary?.name ?? primary?.email ?? session.username,
			identities: identities.map((identity) => ({
				id: identity.id,
				name: identity.name,
				email: identity.email,
				replyTo: identity.replyTo
			}))
		});
	} catch {
		clearSession(cookies);
		return json({ authenticated: false });
	}
};
