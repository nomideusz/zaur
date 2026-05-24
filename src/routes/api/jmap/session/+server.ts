import { json, type RequestHandler } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { readSession } from '$lib/server/session';

export const GET: RequestHandler = async ({ cookies }) => {
	const session = readSession(cookies);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const client = await createConnectedClient(session);
		const jmapSession = client.getSession();
		if (!jmapSession) {
			return json({ error: 'No JMAP session' }, { status: 502 });
		}

		return json({
			session: jmapSession,
			accountId: client.getAccountId(),
			username: client.getUsername()
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'JMAP connection failed';
		return json({ error: message }, { status: 502 });
	}
};
