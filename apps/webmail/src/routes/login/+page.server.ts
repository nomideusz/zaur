import { getOauthClientConfig } from '$lib/server/oidc-discovery';
import type { PageServerLoad } from './$types';

// Resolve the sign-in config during SSR so the form is in the initial HTML. Mobile users
// arriving from registration must never wait on client-side JS plus a config fetch just
// to see the inputs (the old flow left them on "Loading sign-in…" when either stalled).
export const load: PageServerLoad = async ({ url }) => {
	// isAdd comes from the navigated URL here (not the client $page store), so the
	// "already authenticated → go to mail" redirect can be suppressed reliably even
	// during a view-transition navigation.
	return {
		oauthConfig: await getOauthClientConfig(),
		isAdd: url.searchParams.get('mode') === 'add'
	};
};
