import { redirect } from '@sveltejs/kit';
import { DEMO_JMAP_URL } from '#lib/server/demo';
import { getActiveAccount, readSessionFull } from '@zaur/server-auth';
import { jmapAuthMode, safeNext } from '#lib/server/login';
import { isPasswordResetEnabled } from '#lib/server/recovery';
import { passkeySignInAvailable, type PasskeyOutcome } from '#lib/server/passkey-flow';
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
export const load: PageServerLoad = async ({ cookies, url }) => {
	// The demo has no sign-in: the gate signs every visitor in to the sample mailbox.
	if (DEMO_JMAP_URL) redirect(303, '/');
	const session = readSessionFull(cookies);
	const active = session ? getActiveAccount(session) : undefined;
	const adding = url.searchParams.get('mode') === 'add' && Boolean(active);

	const rawNext = url.searchParams.get('next');
	const signedOut = url.searchParams.get('signed_out') === '1';
	const returnTo = signedOut
		? postLogoutTarget(url.searchParams.get('return_to'), null, allOidcRedirectUris())
		: null;
	const next = rawNext ? safeNext(rawNext) : returnTo ? `/z/return?to=${encodeURIComponent(returnTo)}` : '/';
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
		expired: url.searchParams.get('expired') === '1',
		returnName,
		welcome: url.searchParams.get('welcome') === '1',
		registerUrl: process.env.PUBLIC_REGISTER_URL?.trim() || null,
		resetEnabled: isPasswordResetEnabled(),
		/** JMAP_AUTH: `token` asks for an API token instead of a password; `stalwart` keeps the email field strict. */
		authMode: jmapAuthMode(),
		// Filled in from a password reset or a sign-up that just finished.
		email: url.searchParams.get('email')?.trim() ?? '',
		addingTo: adding ? active!.username : null,
		/** Offer "Sign in with a passkey" (Stalwart 1.1+, on its own sign-in page). */
		passkeys: await passkeySignInAvailable(),
		/** How a passkey sign-in that came back without a session ended. */
		passkeyOutcome: passkeyOutcome(url.searchParams.get('passkey'))
	};
};

function passkeyOutcome(raw: string | null): PasskeyOutcome | null {
	return raw === 'cancelled' || raw === 'expired' || raw === 'failed' || raw === 'unavailable' ? raw : null;
}
