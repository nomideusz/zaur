import { json, type RequestHandler } from '@sveltejs/kit';
import {
	completePasskeySignIn,
	normalizeWebAuthnCredential,
	passkeyErrorMessage
} from '$lib/server/logto-experience';
import { isOauthEnabled } from '$lib/server/oidc-discovery';
import { clearPasskeyFlowCookies, readPasskeyFlow } from '$lib/server/oauth-flow';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
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

	let body: { credential?: Record<string, unknown> };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	if (!body.credential) {
		return json({ error: 'Missing passkey response.' }, { status: 400 });
	}

	try {
		const payload = normalizeWebAuthnCredential(body.credential);
		const { code, state } = await completePasskeySignIn({
			logtoCookies: passkeyFlow.logtoCookies,
			verificationId: passkeyFlow.verificationId,
			discoverable: passkeyFlow.discoverable,
			payload,
			forwardedOrigin: url.origin
		});
		clearPasskeyFlowCookies(cookies);
		return json({ code, state });
	} catch (error) {
		console.error('[passkey/verify]', error);
		clearPasskeyFlowCookies(cookies);
		return json({ error: passkeyErrorMessage(error) }, { status: 401 });
	}
};
