import { json, type RequestHandler } from '@sveltejs/kit';
import { completePasskeySignIn, type WebAuthnAssertionPayload } from '$lib/server/logto-experience';
import { isOauthEnabled } from '$lib/server/oidc-discovery';
import { clearPasskeyFlowCookies, readPasskeyFlow } from '$lib/server/oauth-flow';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!isOauthEnabled()) {
		return json({ error: 'Passkey sign-in is not configured.' }, { status: 503 });
	}

	const clientAddress = getClientAddress(request);
	const limit = checkRateLimit({
		key: `passkey-verify:${clientAddress}`,
		limit: 20,
		windowMs: 15 * 60 * 1000
	});
	if (!limit.allowed) {
		return json(
			{ error: `Too many sign-in attempts. Try again in ${limit.retryAfterSec}s.` },
			{ status: 429 }
		);
	}

	const passkeyFlow = readPasskeyFlow(cookies);
	if (!passkeyFlow) {
		return json({ error: 'Passkey session expired. Try again.' }, { status: 400 });
	}

	let body: { credential?: WebAuthnAssertionPayload };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	if (!body.credential?.id || !body.credential?.response) {
		return json({ error: 'Missing passkey response.' }, { status: 400 });
	}

	try {
		const { code, state } = await completePasskeySignIn({
			logtoCookies: passkeyFlow.logtoCookies,
			verificationId: passkeyFlow.verificationId,
			payload: body.credential
		});
		clearPasskeyFlowCookies(cookies);
		return json({ code, state });
	} catch (error) {
		console.error('[passkey/verify]', error);
		clearPasskeyFlowCookies(cookies);
		const message =
			error instanceof Error ? error.message : 'Passkey verification failed.';
		return json({ error: message }, { status: 401 });
	}
};
