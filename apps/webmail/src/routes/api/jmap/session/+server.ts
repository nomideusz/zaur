import { json, type RequestHandler } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { resolveRequestAccount } from '$lib/server/session';
import type { JMAPSession } from '$lib/jmap/types';

function proxySafeSession(session: JMAPSession): JMAPSession {
	return {
		apiUrl: '/api/jmap',
		downloadUrl: '/api/jmap/download',
		...(session.uploadUrl ? { uploadUrl: '/api/jmap/upload' } : {}),
		...(session.eventSourceUrl ? { eventSourceUrl: '/api/jmap/events' } : {}),
		primaryAccounts: session.primaryAccounts,
		accounts: session.accounts,
		capabilities: session.capabilities
	};
}

export const GET: RequestHandler = async ({ cookies, request }) => {
	const account = resolveRequestAccount(cookies, request);
	if (!account) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const client = await createConnectedClient(account, cookies);
		const jmapSession = client.getSession();
		if (!jmapSession) {
			return json({ error: 'No JMAP session' }, { status: 502 });
		}

		return json({
			session: proxySafeSession(jmapSession),
			accountId: client.getAccountId(),
			username: client.getUsername()
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'JMAP connection failed';
		return json({ error: message }, { status: 502 });
	}
};
