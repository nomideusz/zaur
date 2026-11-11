import { createHash, timingSafeEqual } from 'node:crypto';
import { redirect } from '@sveltejs/kit';
import { addAccount, recordSessionDevice, writeSession } from '@zaur/server-auth';
import { attemptAuthorizationLogin, getClientAddress } from '#lib/server/login';
import { loginWithOutcome, takePasskeyFlow } from '#lib/server/passkey-flow';
import type { RequestHandler } from './$types';

function sameState(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Where Stalwart's sign-in page sends the browser back (passkey sign-in, see
 * #lib/server/passkey-flow). Only a flow this browser started is finished:
 * the state must match the one sealed in its cookie.
 */
export const GET: RequestHandler = async ({ cookies, url, request }) => {
	const flow = takePasskeyFlow(cookies);
	// No flow (cookie expired, other browser, or never started here): start again.
	if (!flow) redirect(303, loginWithOutcome('expired', null, false));
	const back = (outcome: Parameters<typeof loginWithOutcome>[0]) =>
		loginWithOutcome(outcome, flow.next, flow.adding);

	const state = url.searchParams.get('state') ?? '';
	if (!sameState(state, flow.state)) redirect(303, back('failed'));

	const oauthError = url.searchParams.get('error');
	if (oauthError) redirect(303, back(oauthError === 'access_denied' ? 'cancelled' : 'failed'));

	const code = url.searchParams.get('code');
	if (!code) redirect(303, back('failed'));

	const result = await attemptAuthorizationLogin({
		code,
		codeVerifier: flow.codeVerifier,
		redirectUri: flow.redirectUri
	});
	if (result.status === 'invalid_credentials') redirect(303, back('expired'));
	if (result.status !== 'ok') redirect(303, back('unavailable'));

	if (flow.adding) addAccount(cookies, result.sessionData, { remember: flow.remember });
	else writeSession(cookies, result.sessionData, { remember: flow.remember });
	recordSessionDevice(
		cookies,
		request.headers.get('user-agent'),
		// Same 16-char ip hash the password sign-in records.
		createHash('sha256').update(getClientAddress(request)).digest('base64url').slice(0, 16)
	);
	// A newly added account starts from the inbox, like the password form's reload.
	redirect(303, flow.adding ? '/' : flow.next);
};
