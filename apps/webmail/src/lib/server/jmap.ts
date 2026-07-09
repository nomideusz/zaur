import { env } from '$env/dynamic/private';
import { JMAPClient } from '$lib/jmap/client';
import type { Cookies } from '@sveltejs/kit';
import type { SessionData } from './session';

export async function createConnectedClient(
	session: SessionData,
	_cookies?: Cookies
): Promise<JMAPClient> {
	// Server-side JMAP goes straight to Stalwart on the docker network when set
	// (JMAP_INTERNAL_URL=http://mail:8080) — long-lived event streams through the
	// public Traefik route get cut and spam reconnect 502s. Browser clients keep
	// using the public URL; JMAPClient rewrites session URLs onto this origin.
	const serverUrl = env.JMAP_INTERNAL_URL || session.serverUrl;
	const client = new JMAPClient(serverUrl, session.username, session.password ?? '');
	await client.connect();
	return client;
}
