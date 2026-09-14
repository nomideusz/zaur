import { redirect } from '@sveltejs/kit';
import { getActiveAccount, readSessionFull } from '@zaur/server-auth';
import type { LayoutServerLoad } from './$types';

/**
 * Own-session gate: no signed-in account (own login or a borrowed 1.0
 * session) → straight to Mail 2.0's login page. Runs before any child load,
 * so signed-out visitors never see the mail shell flash.
 */
export const load: LayoutServerLoad = ({ cookies, url }) => {
	const session = readSessionFull(cookies);
	const active = session ? getActiveAccount(session) : undefined;
	if (!active) {
		const target = url.pathname === '/' && url.search === '' ? '' : `?next=${encodeURIComponent(url.pathname + url.search)}`;
		redirect(303, `/login${target}`);
	}
};
