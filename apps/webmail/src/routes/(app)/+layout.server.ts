import { redirect } from '@sveltejs/kit';
import { readSession } from '$lib/server/session';
import type { LayoutServerLoad } from './$types';

/*
 * Render the app shell on the client only. SSR of this shell would need to register
 * the streamed `unreadCounts` (query.live) hydratable that the client expects, and a
 * mismatch throws `hydratable_missing_but_required` on hydration. The
 * mail/calendar/contacts content is loaded client-side from JMAP/IndexedDB anyway, so
 * SSR of this shell adds little. The server `load` below still runs (page options
 * don't disable server loads), so the unauthenticated → /login redirect guard is
 * preserved.
 */
export const ssr = false;

export const load: LayoutServerLoad = ({ cookies, url }) => {
	if (!readSession(cookies)) {
		const next = `${url.pathname}${url.search}`;
		redirect(303, `/login?next=${encodeURIComponent(next)}`);
	}

	return {};
};
