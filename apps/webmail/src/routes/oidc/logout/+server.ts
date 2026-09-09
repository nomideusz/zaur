import { redirect, type RequestHandler } from '@sveltejs/kit';
import { allOidcRedirectUris } from '$lib/server/oidc';
import { postLogoutTarget } from '$lib/server/oidc/core';
import { removePushSubscriptionsForSession } from '$lib/server/push-subscriptions';
import { pushWatcher } from '$lib/server/push-watcher';
import { clearSession, COOKIE_NAME } from '$lib/server/session';

/*
 * RP-initiated logout (OIDC end_session_endpoint). Bartube's sign-out lands
 * here, so leaving one app signs you out of the identity provider too. Only
 * origins of registered redirect_uris are accepted as post_logout_redirect_uri;
 * anything else is dropped and the page simply offers sign-in.
 */
const endSession: RequestHandler = async ({ url, cookies }) => {
	const sessionId = cookies.get(COOKIE_NAME);
	if (sessionId) {
		await removePushSubscriptionsForSession(sessionId);
		await pushWatcher.refresh();
	}
	clearSession(cookies);

	// Land on our own signed-out page (Zaur Account) rather than the app's stock
	// login card; the validated post_logout_redirect_uri becomes its "Back to <app>".
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
