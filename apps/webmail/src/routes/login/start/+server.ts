import { redirect, type RequestHandler } from '@sveltejs/kit';
import { isOauthEnabled } from '$lib/server/oidc-discovery';
import { startOauthRedirect } from '$lib/server/oauth-flow';

export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!isOauthEnabled()) {
		redirect(303, '/login');
	}

	const email = url.searchParams.get('email')?.trim();
	const rememberMe = url.searchParams.get('remember') === '1';
	const next = url.searchParams.get('next');
	const redirectTo =
		next?.startsWith('/') && !next.startsWith('//') ? next : undefined;

	const redirectUri = `${url.origin}/oauth/callback`;
	const authorizationUrl = await startOauthRedirect({
		cookies,
		redirectUri,
		loginHint: email,
		rememberMe,
		redirectTo
	});

	redirect(303, authorizationUrl);
};
