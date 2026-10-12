import { redirect } from '@sveltejs/kit';
import { getActiveAccount, readSessionFull } from '@zaur/server-auth';
import { featuresOf, offered, type Features } from '#lib/features';
import { createConnectedClient } from '#lib/server/jmap';
import { meetConfig } from '#lib/server/meet';
import type { LayoutServerLoad } from './$types';

/**
 * Own-session gate: no signed-in account (own login or a borrowed 1.0
 * session) → straight to Mail 2.0's login page. Runs before any child load,
 * so signed-out visitors never see the mail shell flash.
 *
 * `features` is what the account's server offers (#lib/features): the shell
 * links only to those sections. Null when the server could not be asked —
 * then everything shows and each pane says what it could not load.
 */
export const load: LayoutServerLoad = async ({ cookies, url, untrack }) => {
	const session = readSessionFull(cookies);
	const active = session ? getActiveAccount(session) : undefined;
	if (!session || !active) {
		const target = url.pathname === '/' && url.search === '' ? '' : `?next=${encodeURIComponent(url.pathname + url.search)}`;
		redirect(303, `/login${target}`);
	}
	let features: Features | null = null;
	try {
		features = featuresOf(await createConnectedClient({ ...active, id: session.id }));
	} catch {
		// Signed out or the server is down: the pages handle both.
	}
	// A section this server lacks, reached directly (an installed-app shortcut, a
	// bookmark): go to mail rather than a page that can only say it is missing.
	// Untracked, so client-side navigation does not re-run this load.
	if (!offered(untrack(() => url.pathname), features)) redirect(303, '/');
	return { meetEnabled: meetConfig() !== null, features };
};
