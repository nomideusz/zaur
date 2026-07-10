import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import {
	getStalwartOauthRedirectUri,
	isRedirectOauthRollbackEnabled,
	isStalwartOauthEnabled
} from '$lib/server/oauth-config';
import { createOauthFlow, sanitizeLocalRedirect } from '$lib/server/oauth-flow';
import { readSessionFull } from '$lib/server/session';

export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!isStalwartOauthEnabled() || !isRedirectOauthRollbackEnabled()) redirect(303, '/login');

	const requestedMode = url.searchParams.get('mode');
	const currentSession = readSessionFull(cookies);
	const mode = requestedMode === 'add' && currentSession ? 'add' : 'login';
	const loginHint = url.searchParams.get('email')?.trim().toLowerCase();

	let authorizationUrl: string;
	try {
		authorizationUrl = await createOauthFlow({
			cookies,
			redirectUri: getStalwartOauthRedirectUri(url.origin),
			redirectTo: sanitizeLocalRedirect(url.searchParams.get('next')),
			mode,
			rememberMe: url.searchParams.get('remember') === '1',
			originatingSessionId: mode === 'add' ? currentSession?.id : undefined,
			loginHint: loginHint?.includes('@') ? loginHint : undefined
		});
	} catch {
		error(503, 'Secure sign-in is temporarily unavailable');
	}
	redirect(303, authorizationUrl);
};
