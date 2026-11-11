import { redirect } from '@sveltejs/kit';
import { beginStalwartAuthorization, getActiveAccount, readSessionFull } from '@zaur/server-auth';
import { safeNext } from '#lib/server/login';
import { loginWithOutcome, passkeySignInAvailable, savePasskeyFlow } from '#lib/server/passkey-flow';
import { reportError } from '#lib/server/report';
import type { RequestHandler } from './$types';

/**
 * "Sign in with a passkey": off to Stalwart's sign-in page, which runs the
 * passkey ceremony on its own origin and sends the browser back to
 * /z/oauth/callback. See #lib/server/passkey-flow.
 */
export const GET: RequestHandler = async ({ cookies, url }) => {
	const next = safeNext(url.searchParams.get('next'));
	const adding = url.searchParams.get('mode') === 'add';
	const session = readSessionFull(cookies);
	if (session && getActiveAccount(session) && !adding) redirect(303, next);

	if (!(await passkeySignInAvailable())) redirect(303, loginWithOutcome('unavailable', next, adding));

	let flow;
	try {
		flow = await beginStalwartAuthorization({ requestOrigin: url.origin });
	} catch (error) {
		reportError(error, { where: 'passkey sign-in: start' });
		redirect(303, loginWithOutcome('unavailable', next, adding));
	}
	savePasskeyFlow(cookies, {
		state: flow.state,
		codeVerifier: flow.codeVerifier,
		redirectUri: flow.redirectUri,
		next,
		remember: url.searchParams.get('remember') === '1',
		adding
	});
	// Kit 3 refuses an off-site redirect unless told it is one.
	redirect(303, flow.url, { external: true });
};
