import { redirect } from '@sveltejs/kit';
import { accountKey, getActiveAccount, readSessionFull } from '@zaur/server-auth';
import { featuresOf, offered, type Features } from '#lib/features';
import { DEMO_JMAP_URL, signInDemo } from '#lib/server/demo';
import { createConnectedClient, isSessionRejected } from '#lib/server/jmap';
import { meetConfig } from '#lib/server/meet';
import { signOutOf } from '#lib/server/sign-out';
import type { LayoutServerLoad } from './$types';

/**
 * Own-session gate: no signed-in account (own login or a borrowed 1.0
 * session) → straight to Mail 2.0's login page. Runs before any child load,
 * so signed-out visitors never see the mail shell flash.
 *
 * `features` is what the account's server offers (#lib/features): the shell
 * links only to those sections. Null when the server could not be asked —
 * then everything shows and each pane says what it could not load.
 *
 * An account the server no longer accepts (its tokens were revoked, or did not
 * survive a server migration) is signed out here. Every pane would otherwise
 * wait on data that can never come.
 */
function loginUrl(url: URL, expired = false): string {
	const params = new URLSearchParams();
	if (url.pathname !== '/' || url.search !== '') params.set('next', url.pathname + url.search);
	if (expired) params.set('expired', '1');
	const query = params.toString();
	return query ? `/login?${query}` : '/login';
}

export const load: LayoutServerLoad = async ({ cookies, url, untrack }) => {
	let session = readSessionFull(cookies);
	// The demo signs a visitor in on arrival; the cookie it sets reads back at once.
	if (!session && DEMO_JMAP_URL) {
		signInDemo(cookies);
		session = readSessionFull(cookies);
	}
	const active = session ? getActiveAccount(session) : undefined;
	if (!session || !active) {
		redirect(303, loginUrl(url));
	}
	let features: Features | null = null;
	try {
		features = featuresOf(await createConnectedClient({ ...active, id: session.id }));
	} catch (cause) {
		if (isSessionRejected(cause)) {
			const remaining = signOutOf(cookies, session, accountKey(active.username));
			redirect(303, remaining ? url.pathname + url.search : loginUrl(url, true));
		}
		// The server is down: the pages handle it.
	}
	// A section this server lacks, reached directly (an installed-app shortcut, a
	// bookmark): go to mail rather than a page that can only say it is missing.
	// Untracked, so client-side navigation does not re-run this load.
	if (!offered(untrack(() => url.pathname), features)) redirect(303, '/');
	return { meetEnabled: meetConfig() !== null, features };
};
