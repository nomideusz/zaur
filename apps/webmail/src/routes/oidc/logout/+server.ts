import { redirect, type RequestHandler } from '@sveltejs/kit';
import { oidcProviderClient } from '$lib/server/oidc';
import { postLogoutTarget } from '$lib/server/oidc/core';
import { removePushSubscriptionsForSession } from '$lib/server/push-subscriptions';
import { pushWatcher } from '$lib/server/push-watcher';
import { clearSession, COOKIE_NAME } from '$lib/server/session';

/*
 * RP-initiated logout (OIDC end_session_endpoint). Bartube's sign-out lands
 * here, so leaving one app signs you out of the identity provider too, then
 * returns to the app. Only origins of registered redirect_uris are accepted as
 * post_logout_redirect_uri — everything else goes to /login.
 */
const endSession: RequestHandler = async ({ url, cookies }) => {
	const client = oidcProviderClient();
	const sessionId = cookies.get(COOKIE_NAME);
	if (sessionId) {
		await removePushSubscriptionsForSession(sessionId);
		await pushWatcher.refresh();
	}
	clearSession(cookies);

	const target = postLogoutTarget(
		url.searchParams.get('post_logout_redirect_uri'),
		url.searchParams.get('state'),
		client?.redirectUris ?? []
	);
	redirect(303, target ?? '/login');
};

export const GET = endSession;
export const POST = endSession;
