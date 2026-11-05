import { redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { getDb } from '#lib/server/db';
import { startGeo } from '#lib/server/geo';
import { markOwnerIp, sweep } from '#lib/server/ingest';
import { clientIp } from '#lib/server/ip';
import { isAdmin, readUser, secret } from '#lib/server/session';

export const init: ServerInit = () => {
	startGeo();
	const clean = () => sweep(getDb());
	clean();
	setInterval(clean, 6 * 3600_000).unref();
};

// Development only: read the dashboard without mail's sign-in.
const devUser = () => {
	const email = process.env.NODE_ENV !== 'production' ? process.env.STATS_DEV_USER?.trim() : '';
	return email ? { email, name: 'dev' } : null;
};

// Everything needs a sign-in but the beacon, the sign-in itself and /health.
// s.js is a static file, served ahead of this.
export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	if (pathname === '/health') return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
	if (pathname === '/api/hit') {
		return event.request.method === 'POST' ? resolve(event) : new Response(null, { status: 405 });
	}

	// Kit's own check, off in vite.config.ts because of the beacon.
	const origin = event.request.headers.get('origin');
	if (!['GET', 'HEAD'].includes(event.request.method) && origin !== event.url.origin) return new Response('Cross-site request', { status: 403 });

	if (!pathname.startsWith('/auth/')) {
		const user = devUser() ?? readUser(event.cookies);
		if (!user || !(devUser() || isAdmin(user.email))) {
			if (pathname.startsWith('/api/')) return new Response('Sign in first', { status: 401 });
			redirect(303, `/auth/login?next=${encodeURIComponent(pathname + event.url.search)}`);
		}
		event.locals.user = user;
		// Whoever reads this is the owner: their address's visits are Mine, on every site.
		markOwnerIp(getDb(), clientIp(event), secret());
	}

	const response = await resolve(event);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'no-referrer');
	return response;
};
