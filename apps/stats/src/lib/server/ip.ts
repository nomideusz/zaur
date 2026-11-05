import type { RequestEvent } from '@sveltejs/kit';

/** Traefik puts the visitor first in X-Forwarded-For, and drops what a client sent there itself. */
export function clientIp(event: Pick<RequestEvent, 'request' | 'getClientAddress'>): string {
	const forwarded = event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
	let ip = forwarded ?? '';
	if (!ip) {
		try {
			ip = event.getClientAddress();
		} catch {
			ip = '';
		}
	}
	return ip.replace(/^::ffff:/, '');
}
