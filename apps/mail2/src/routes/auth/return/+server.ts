import { redirect, type RequestHandler } from '@sveltejs/kit';
import { postLogoutTarget } from '@zaur/server-auth/oidc';
import { allOidcRedirectUris } from '#lib/server/oidc';

/* Same-origin hop back to a relying party (registered client origins only), so
 * the login page's plain relative `next` can return someone who signed out of
 * Bartube to Bartube once they sign in again. */
export const GET: RequestHandler = ({ url }) => {
	const target = postLogoutTarget(url.searchParams.get('to'), null, allOidcRedirectUris());
	redirect(303, target ?? '/', { external: true });
};
