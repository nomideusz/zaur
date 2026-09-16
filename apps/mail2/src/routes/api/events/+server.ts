import { error, type Cookies, type RequestHandler } from '@sveltejs/kit';
import { getActiveAccount, readSessionFull } from '@zaur/server-auth';
import type { SessionData } from '@zaur/server-auth';
import { createConnectedClient } from '#lib/server/jmap';

const KEEPALIVE_MS = 15_000;

function requireAccount(cookies: Cookies): SessionData {
	const session = readSessionFull(cookies);
	const account = session ? getActiveAccount(session) : undefined;
	if (!account) error(401, 'Unauthorized');
	return account;
}

/**
 * JMAP push, proxied.
 *
 * Stalwart's `eventSourceUrl` (RFC 8620 §7.3) needs the account's credentials,
 * and the browser's `EventSource` cannot send them — it has no header API and
 * the tokens must never reach the client anyway. So the stream is opened
 * server-side and piped through, the same shape webmail 1.0 uses.
 *
 * A stream is not remote-function state, so this is a plain endpoint: remote
 * `query`/`command` are request/response, and this one is open for hours.
 */
export const GET: RequestHandler = async ({ cookies, request }) => {
	const account = requireAccount(cookies);

	let client;
	try {
		client = await createConnectedClient(account);
	} catch (cause) {
		if (cause instanceof Error && cause.message === 'Unauthorized') error(401, 'Unauthorized');
		console.error('[api/events] JMAP connect failed:', cause);
		error(502, 'JMAP connection failed');
	}

	// Not every deployment advertises the capability; the client falls back to
	// polling on a 501 rather than retrying a stream that will never open.
	if (!client.getSession()?.eventSourceUrl) {
		error(501, 'EventSource not available');
	}

	let upstream: Response;
	try {
		upstream = await client.openEventStream();
	} catch (cause) {
		console.error('[api/events] Could not open the push stream:', cause);
		error(502, 'Failed to connect to the push stream');
	}
	if (!upstream.ok || !upstream.body) {
		error(upstream.status || 502, 'Failed to connect to the push stream');
	}

	const reader = upstream.body.getReader();
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		start(controller) {
			// Our own keepalive on top of Stalwart's `ping`: proxies in between
			// drop a stream that goes quiet, and the client's stale timer needs
			// something to hear even if the upstream ping interval drifts.
			const keepalive = setInterval(() => {
				try {
					controller.enqueue(encoder.encode('event: ping\ndata: {}\n\n'));
				} catch {
					clearInterval(keepalive);
				}
			}, KEEPALIVE_MS);

			const pump = async () => {
				try {
					while (!request.signal.aborted) {
						const { done, value } = await reader.read();
						if (done) break;
						controller.enqueue(value);
					}
				} catch {
					// Client went away, or upstream closed.
				} finally {
					clearInterval(keepalive);
					try {
						controller.close();
					} catch {
						// Already closed.
					}
					void reader.cancel().catch(() => {});
				}
			};

			void pump();
		},
		cancel() {
			void reader.cancel().catch(() => {});
		}
	});

	request.signal.addEventListener('abort', () => {
		void reader.cancel().catch(() => {});
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			// nginx buffers text/event-stream by default, which holds every event
			// until the buffer fills — this is the header that makes push push.
			'X-Accel-Buffering': 'no'
		}
	});
};
