import { redirect } from '@sveltejs/kit';
import { readSession } from '$lib/server/session';
import type { LayoutServerLoad } from './$types';

/*
 * Render the app shell on the client only. Auth is client-side (Logto tokens in
 * IndexedDB), so a server request often has no `zaur_session` cookie even when the
 * user is signed in — SSR would then bail/redirect and never register the streamed
 * `unreadCounts` (query.live) hydratable that the client expects, throwing
 * `hydratable_missing_but_required` on hydration. The mail/calendar/contacts content
 * is loaded client-side from JMAP/IndexedDB anyway, so SSR of this shell adds little.
 * The server `load` below still runs (page options don't disable server loads), so the
 * unauthenticated → /login redirect guard is preserved.
 */
export const ssr = false;

export const load: LayoutServerLoad = ({ cookies, url }) => {
	if (!readSession(cookies)) {
		const next = `${url.pathname}${url.search}`;
		redirect(303, `/login?next=${encodeURIComponent(next)}`);
	}

	return {};
};
