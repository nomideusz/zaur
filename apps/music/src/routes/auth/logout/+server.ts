import { redirect, type RequestHandler } from '@sveltejs/kit';
import { logoutUrl } from '#lib/server/oidc';
import { clearUser } from '#lib/server/session';

export const POST: RequestHandler = async ({ url, cookies }) => {
	clearUser(cookies);
	redirect(303, await logoutUrl(url.origin), { external: true });
};
