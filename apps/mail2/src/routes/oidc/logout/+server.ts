import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { clearSession, deletePushSubscriptionsForSession, getStoreDb, readSessionFull } from '@zaur/server-auth';
import { isNavigation, postLogoutTarget } from '@zaur/server-auth/oidc';
import { allOidcRedirectUris } from '#lib/server/oidc';
import { pushWatcher } from '#lib/server/push-watcher';

/*
 * RP-initiated logout (end_session_endpoint): signing out of Bartube signs
 * out of mail too. It lands on our own signed-out page; a
 * post_logout_redirect_uri on a registered client's origin becomes its
 * "Back to <app>", anything else is dropped.
 *
 * Only as a navigation: relying parties send the browser here, and nothing
 * embedded in a page (an <img>, a fetch, a frame) may end the session.
 */
const endSession: RequestHandler = ({ url, cookies, request }) => {
	if (!isNavigation(request.headers)) error(400, 'Sign-out is a page, not a resource');
	const session = readSessionFull(cookies);
	if (session) {
		deletePushSubscriptionsForSession(getStoreDb(), session.id);
		pushWatcher.sync();
	}
	clearSession(cookies);

	const target = postLogoutTarget(
		url.searchParams.get('post_logout_redirect_uri'),
		url.searchParams.get('state'),
		allOidcRedirectUris()
	);
	const query = new URLSearchParams({ signed_out: '1' });
	if (target) query.set('return_to', target);
	redirect(303, `/login?${query}`);
};

export const GET = endSession;
export const POST = endSession;
