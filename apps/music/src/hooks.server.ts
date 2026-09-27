import type { Handle } from '@sveltejs/kit/hooks';
import { readUser } from '#lib/server/session';

// Pages send the signed-out through mail's sign-in (signedIn() in their loads,
// so client-side navigations redirect too); the API just says no.
export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/health') return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
	event.locals.user = readUser(event.cookies);
	if (!event.locals.user && event.url.pathname.startsWith('/api/')) return new Response('Sign in first', { status: 401 });
	const response = await resolve(event);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	return response;
};
