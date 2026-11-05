// The live page's stream: a picture on connect, on every beacon for this site
// (at most one a second), and when the minute turns. Hooks has checked the sign-in.
import { error, type RequestHandler } from '@sveltejs/kit';
import { onHit } from '#lib/server/bus';
import { getDb } from '#lib/server/db';
import { liveSnapshot, type Who } from '#lib/server/report';
import { siteById } from '#lib/sites';

const MIN_GAP_MS = 1000;

export const GET: RequestHandler = ({ url, request }) => {
	const site = url.searchParams.get('site') ?? 'all';
	if (site !== 'all' && !siteById(site)) error(404, 'No such site');
	const w = url.searchParams.get('who');
	const who: Who = w === 'mine' ? 'mine' : w === 'all' ? 'all' : 'others';

	const encoder = new TextEncoder();
	let stop = () => {};
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			let last = 0;
			let pending: ReturnType<typeof setTimeout> | undefined;
			const write = (text: string) => {
				try {
					controller.enqueue(encoder.encode(text));
				} catch {
					stop();
				}
			};
			const send = () => {
				pending = undefined;
				last = Date.now();
				write(`data: ${JSON.stringify(liveSnapshot(getDb(), { site, who }))}\n\n`);
			};
			const soon = () => {
				if (pending) return;
				pending = setTimeout(send, Math.max(0, last + MIN_GAP_MS - Date.now()));
			};
			send();
			const off = onHit((s) => {
				if (site === 'all' || s === site) soon();
			});
			// The bars shift when the minute turns, and this keeps proxies from closing a quiet stream.
			const tick = setInterval(soon, 30_000);
			const keep = setInterval(() => write(': keep\n\n'), 20_000);
			stop = () => {
				off();
				clearInterval(tick);
				clearInterval(keep);
				if (pending) clearTimeout(pending);
				stop = () => {};
				try {
					controller.close();
				} catch {
					// Already closed by the client.
				}
			};
			request.signal.addEventListener('abort', () => stop());
		},
		cancel() {
			stop();
		}
	});
	return new Response(stream, {
		headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store', 'x-accel-buffering': 'no' }
	});
};
