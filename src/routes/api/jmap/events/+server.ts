import { error, type RequestHandler } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { readSession } from '$lib/server/session';

export const GET: RequestHandler = async ({ cookies }) => {
	const session = readSession(cookies);
	if (!session) {
		error(401, 'Unauthorized');
	}

	try {
		const client = await createConnectedClient(session);
		if (!client.getSession()?.eventSourceUrl) {
			error(501, 'EventSource not available');
		}

		const upstream = await client.openEventStream();
		if (!upstream.ok || !upstream.body) {
			error(502, 'Failed to connect to push stream');
		}

		return new Response(upstream.body, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive'
			}
		});
	} catch {
		error(502, 'Failed to connect to push stream');
	}
};
