import { redirect, type RequestHandler } from '@sveltejs/kit';
import { beginLogin } from '#lib/server/oidc';
import { seal } from '#lib/server/session';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const asked = url.searchParams.get('next') ?? '/';
	// Our own paths only.
	const next = asked.startsWith('/') && !asked.startsWith('//') ? asked : '/';
	const { url: target, tx } = await beginLogin(url.origin, next);
	cookies.set('zaur_music_login', seal(tx), {
		path: '/auth',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: 600
	});
	redirect(303, target, { external: true });
};
