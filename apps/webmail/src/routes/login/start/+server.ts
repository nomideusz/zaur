import { redirect, type RequestHandler } from '@sveltejs/kit';
import { isOauthEnabled } from '$lib/server/oidc-discovery';
import { startOauthRedirect } from '$lib/server/oauth-flow';
import { readSessionFull } from '$lib/server/session';

export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!isOauthEnabled()) {
		redirect(303, '/login');
	}

	const isAdd = url.searchParams.get('mode') === 'add';
	// Adding an account only makes sense while signed in; otherwise treat as a fresh login.
	if (isAdd && !readSessionFull(cookies)) {
		redirect(303, '/login');
	}

	const email = url.searchParams.get('email')?.trim().toLowerCase();
	// A normal (passkey) start needs the email hint; an add-account start does not —
	// Logto re-prompts (prompt=login) so the user can sign in as a different identity.
	if (!isAdd && (!email || !email.includes('@'))) {
		redirect(303, '/login?error=passkey_email');
	}

	const rememberMe = url.searchParams.get('remember') === '1';
	const next = url.searchParams.get('next');
	const redirectTo = next?.startsWith('/') && !next.startsWith('//') ? next : undefined;
	const hasEmailHint = !!email && email.includes('@');

	const redirectUri = `${url.origin}/oauth/callback`;
	const authorizationUrl = await startOauthRedirect({
		cookies,
		redirectUri,
		loginHint: hasEmailHint ? email : undefined,
		firstScreen: hasEmailHint ? 'identifier:sign-in' : undefined,
		identifier: hasEmailHint ? 'email' : undefined,
		rememberMe,
		redirectTo,
		mode: isAdd ? 'add' : 'login'
	});

	redirect(303, authorizationUrl);
};
