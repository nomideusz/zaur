import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/public';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';

/*
 * Sentry envelope tunnel. Browser SDK posts here (same origin, so the
 * `connect-src 'self'` CSP holds); we forward to the configured DSN host.
 * Only the DSN this app is configured with is ever forwarded to — this is
 * not an open relay.
 */

const MAX_ENVELOPE_BYTES = 200 * 1024;

function parseDsn(dsn: string): { origin: string; projectId: string } | null {
	try {
		const url = new URL(dsn);
		const projectId = url.pathname.replace(/\//g, '');
		if (!projectId) return null;
		return { origin: url.origin, projectId };
	} catch {
		return null;
	}
}

export const POST: RequestHandler = async ({ request }) => {
	const configured = env.PUBLIC_SENTRY_DSN?.trim();
	const target = configured ? parseDsn(configured) : null;
	if (!target) {
		return new Response(null, { status: 404 });
	}

	const rate = checkRateLimit({
		key: `error-tunnel:${getClientAddress(request)}`,
		limit: 60,
		windowMs: 60_000
	});
	if (!rate.allowed) {
		return new Response(null, {
			status: 429,
			headers: { 'Retry-After': String(rate.retryAfterSec) }
		});
	}

	const envelope = await request.text();
	if (!envelope || envelope.length > MAX_ENVELOPE_BYTES) {
		return new Response(null, { status: 400 });
	}

	// Envelope header (first line) must name the DSN we are configured for.
	let headerDsn: string | undefined;
	try {
		headerDsn = (JSON.parse(envelope.slice(0, envelope.indexOf('\n'))) as { dsn?: string }).dsn;
	} catch {
		return new Response(null, { status: 400 });
	}
	if (headerDsn?.trim() !== configured) {
		return new Response(null, { status: 400 });
	}

	const upstream = await fetch(`${target.origin}/api/${target.projectId}/envelope/`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-sentry-envelope' },
		body: envelope
	});

	return new Response(null, { status: upstream.ok ? 200 : upstream.status });
};
