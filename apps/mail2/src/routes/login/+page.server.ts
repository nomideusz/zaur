import { redirect } from '@sveltejs/kit';
import { getActiveAccount, readSessionFull } from '@zaur/server-auth';
import { safeNext } from '#lib/server/login';
import { isPasswordResetEnabled } from '#lib/server/recovery';
import { postLogoutTarget } from '@zaur/server-auth/oidc';
import { allOidcRedirectUris, findOidcClient, findOidcClientByOrigin } from '#lib/server/oidc';
import type { PageServerLoad } from './$types';

/**
 * Already signed in → land in the app (or the validated `next` target).
 * `registerUrl` feeds the "create your address" sign-up link; account
 * creation itself stays with the register service (invite/open signup there),
 * which provisions the real mailbox on Stalwart.
 *
 * `?email=` pre-fills the address (after a password reset or a sign-up,
 * which also sets `?welcome=1`).
 *
 * Sign-in started by another app (`next` = /oidc/authorize?client_id=…) names
 * that app: "Sign in to continue to Bartube". After signing out of one
 * (`?signed_out=1`, from /oidc/logout), a `return_to` on a registered client's
 * origin makes signing in again go back there instead of into mail.
 *
 * `?mode=add` is the exception: signed in already, adding another account to
 * this browser's session (the account menu's "Add account").
 */
export const load: PageServerLoad = ({ cookies, url }) => {
	const session = readSessionFull(cookies);
	const active = session ? getActiveAccount(session) : undefined;
	const adding = url.searchParams.get('mode') === 'add' && Boolean(active);

	const rawNext = url.searchParams.get('next');
	const signedOut = url.searchParams.get('signed_out') === '1';
	const returnTo = signedOut
		? postLogoutTarget(url.searchParams.get('return_to'), null, allOidcRedirectUris())
		: null;
	const next = rawNext ? safeNext(rawNext) : returnTo ? `/auth/return?to=${encodeURIComponent(returnTo)}` : '/';
	// Also where a sign-in lands: the form's success re-runs this load, and its
	// redirect beats the page's own goto — so it must know about `return_to` too.
	if (active && !adding) redirect(303, next);

	const continueTo = rawNext?.startsWith('/oidc/authorize')
		? findOidcClient(new URL(rawNext, url).searchParams.get('client_id'))?.name
		: undefined;
	const returnName = returnTo ? (findOidcClientByOrigin(returnTo)?.name ?? 'the app') : null;
	return {
		next,
		continueTo,
		signedOut,
		returnName,
		welcome: url.searchParams.get('welcome') === '1',
		registerUrl: process.env.PUBLIC_REGISTER_URL?.trim() || null,
		resetEnabled: isPasswordResetEnabled(),
		// Filled in from a password reset or a sign-up that just finished.
		email: url.searchParams.get('email')?.trim() ?? '',
		addingTo: adding ? active!.username : null
	};
};
