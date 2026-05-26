import { error, type RequestHandler } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { readSession } from '$lib/server/session';

const KEEPALIVE_MS = 25_000;

function streamWithKeepalive(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
	const reader = body.getReader();
	const encoder = new TextEncoder();
	let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

	return new ReadableStream({
		start(controller) {
			keepaliveTimer = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': keepalive\n\n'));
				} catch {
					// Stream already closed
				}
			}, KEEPALIVE_MS);

			void (async () => {
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						controller.enqueue(value);
					}
					controller.close();
				} catch {
					controller.error(new Error('Push stream closed'));
				} finally {
					if (keepaliveTimer) clearInterval(keepaliveTimer);
				}
			})();
		},
		cancel() {
			if (keepaliveTimer) clearInterval(keepaliveTimer);
			void reader.cancel();
		}
	});
}

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

		return new Response(streamWithKeepalive(upstream.body), {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no'
			}
		});
	} catch {
		error(502, 'Failed to connect to push stream');
	}
};
