import type { RequestHandler } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { resolveRequestAccount } from '$lib/server/session';

const KEEPALIVE_MS = 15_000;

export const GET: RequestHandler = async ({ cookies, request }) => {
	const account = resolveRequestAccount(cookies, request);
	if (!account) {
		return new Response('Unauthorized', { status: 401 });
	}

	let client;
	try {
		client = await createConnectedClient(account, cookies);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'JMAP connection failed';
		return new Response(message, { status: 502 });
	}

	if (!client.getSession()?.eventSourceUrl) {
		return new Response('EventSource not available', { status: 501 });
	}

	const upstream = await client.openEventStream();
	if (!upstream.ok || !upstream.body) {
		return new Response('Failed to connect to push stream', { status: upstream.status || 502 });
	}

	const upstreamReader = upstream.body.getReader();
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		start(controller) {
			const keepalive = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': keepalive\n\n'));
				} catch {
					clearInterval(keepalive);
				}
			}, KEEPALIVE_MS);

			const pump = async () => {
				try {
					while (!request.signal.aborted) {
						const { done, value } = await upstreamReader.read();
						if (done) break;
						controller.enqueue(value);
					}
				} catch {
					// Client disconnected or upstream closed
				} finally {
					clearInterval(keepalive);
					try {
						controller.close();
					} catch {
						// Already closed
					}
					void upstreamReader.cancel().catch(() => {});
				}
			};

			void pump();
		},
		cancel() {
			void upstreamReader.cancel().catch(() => {});
		}
	});

	request.signal.addEventListener('abort', () => {
		void upstreamReader.cancel().catch(() => {});
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};
