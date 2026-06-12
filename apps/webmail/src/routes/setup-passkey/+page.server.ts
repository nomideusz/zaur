import { getOauthClientConfig } from '$lib/server/oidc-discovery';
import type { PageServerLoad } from './$types';

// Same as /login: resolve the sign-in config during SSR so the page never waits on a
// client-side config fetch that can stall on mobile networks right after registration.
export const load: PageServerLoad = async () => {
	return { oauthConfig: await getOauthClientConfig() };
};
