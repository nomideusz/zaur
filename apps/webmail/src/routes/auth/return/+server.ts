import { redirect, type RequestHandler } from '@sveltejs/kit';
import { allOidcRedirectUris } from '$lib/server/oidc';
import { postLogoutTarget } from '$lib/server/oidc/core';

/* Same-origin hop back to a relying party (only registered client origins),
 * so the login page can use a plain relative `next` to send someone who
 * signed out of Bartube back into Bartube after signing in again. */
export const GET: RequestHandler = ({ url }) => {
	redirect(303, postLogoutTarget(url.searchParams.get('to'), null, allOidcRedirectUris()) ?? '/');
};
