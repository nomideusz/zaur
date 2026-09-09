import type { PageServerLoad } from './$types';
import { isPasswordResetEnabled } from '$lib/server/register-api';
import { allOidcRedirectUris, findOidcClient, findOidcClientByOrigin } from '$lib/server/oidc';
import { postLogoutTarget } from '$lib/server/oidc/core';

// Resolve the sign-in config during SSR so the form is in the initial HTML. Mobile users
// arriving from registration must never wait on client-side JS just to see the inputs.
/** When sign-in was started by another app (next = /oidc/authorize?client_id=…),
 * name that app so the page reads "continue to Bartube" instead of "open mail". */
function continueTo(next: string | null): string | undefined {
	if (!next?.startsWith('/oidc/authorize')) return undefined;
	try {
		return findOidcClient(new URL(next, 'http://x').searchParams.get('client_id'))?.name;
	} catch {
		return undefined;
	}
}

/** After RP-initiated logout: where "Back to <app>" goes, re-validated against the registry. */
function signedOutReturn(url: URL): { returnTo: string; returnName: string } | undefined {
	if (url.searchParams.get('signed_out') !== '1') return undefined;
	const returnTo = postLogoutTarget(url.searchParams.get('return_to'), null, allOidcRedirectUris());
	if (!returnTo) return undefined;
	return { returnTo, returnName: findOidcClientByOrigin(returnTo)?.name ?? 'the app' };
}

export const load: PageServerLoad = async ({ url }) => {
	// isAdd comes from the navigated URL here (not the client $page store), so the
	// "already authenticated → go to mail" redirect can be suppressed reliably even
	// during a view-transition navigation.
	return {
		isAdd: url.searchParams.get('mode') === 'add',
		passwordResetEnabled: isPasswordResetEnabled(),
		continueTo: continueTo(url.searchParams.get('next')),
		signedOut: url.searchParams.get('signed_out') === '1',
		signedOutReturn: signedOutReturn(url)
	};
};
