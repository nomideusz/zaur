import { JMAPClient } from '$lib/jmap/client';
import type { SessionData } from './session';

export async function createConnectedClient(session: SessionData): Promise<JMAPClient> {
	const client = new JMAPClient(session.serverUrl, session.username, session.password);
	await client.connect();
	return client;
}
