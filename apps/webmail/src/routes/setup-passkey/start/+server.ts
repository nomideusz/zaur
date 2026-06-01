import { redirect, type RequestHandler } from '@sveltejs/kit';
import { isOauthEnabled } from '$lib/server/oidc-discovery';
import { startOauthRedirect } from '$lib/server/oauth-flow';

export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!isOauthEnabled()) {
		redirect(303, '/login');
	}

	const email = url.searchParams.get('email')?.trim().toLowerCase();
	const token = url.searchParams.get('token')?.trim();
	if (!email || !token) {
		redirect(303, '/setup-passkey');
	}

	const redirectUri = `${url.origin}/oauth/callback`;
	const authorizationUrl = await startOauthRedirect({
		cookies,
		redirectUri,
		loginHint: email,
		oneTimeToken: token,
		rememberMe: true,
		redirectTo: '/mail/inbox'
	});

	redirect(303, authorizationUrl);
};
