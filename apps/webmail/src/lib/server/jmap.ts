import { JMAPClient } from '$lib/jmap/client';
import type { Cookies } from '@sveltejs/kit';
import type { SessionData } from './session';

export async function createConnectedClient(
	session: SessionData,
	_cookies?: Cookies
): Promise<JMAPClient> {
	const client = new JMAPClient(session.serverUrl, session.username, session.password ?? '');
	await client.connect();
	return client;
}
