import { redirect } from '@sveltejs/kit';
import { getActiveAccount, readSessionFull } from '@zaur/server-auth';
import { safeNext } from '#lib/server/login';
import type { PageServerLoad } from './$types';

/**
 * Already signed in → land in the app (or the validated `next` target).
 * `registerUrl` feeds the "create your address" sign-up link; account
 * creation itself stays with the register service (invite/open signup there),
 * which provisions the real mailbox on Stalwart.
 *
 * `?mode=add` is the exception: signed in already, adding another account to
 * this browser's session (the account menu's "Add account").
 */
export const load: PageServerLoad = ({ cookies, url }) => {
	const session = readSessionFull(cookies);
	const active = session ? getActiveAccount(session) : undefined;
	const adding = url.searchParams.get('mode') === 'add' && Boolean(active);
	if (active && !adding) redirect(303, safeNext(url.searchParams.get('next')));
	return {
		next: safeNext(url.searchParams.get('next')),
		registerUrl: process.env.PUBLIC_REGISTER_URL?.trim() || null,
		addingTo: adding ? active!.username : null
	};
};
