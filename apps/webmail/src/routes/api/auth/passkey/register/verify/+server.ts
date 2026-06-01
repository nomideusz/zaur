import { json, type RequestHandler } from '@sveltejs/kit';
import {
	completePasskeyRegistration,
	normalizeWebAuthnRegistration,
	passkeyErrorMessage
} from '$lib/server/logto-experience';
import { isOauthEnabled } from '$lib/server/oidc-discovery';
import { clearOauthFlowCookies, clearPasskeyFlowCookies, readPasskeyFlow } from '$lib/server/oauth-flow';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	if (!isOauthEnabled()) {
		return json({ error: 'Passkey setup is not configured.' }, { status: 503 });
	}

	const clientAddress = getClientAddress(request);
	const limit = checkRateLimit({
		key: `passkey-register-verify:${clientAddress}`,
		limit: 10,
		windowMs: 15 * 60 * 1000
	});
	if (!limit.allowed) {
		return json(
			{ error: `Too many attempts. Try again in ${limit.retryAfterSec}s.` },
			{ status: 429 }
		);
	}

	const passkeyFlow = readPasskeyFlow(cookies);
	if (!passkeyFlow || passkeyFlow.flow !== 'register' || !passkeyFlow.verificationId) {
		return json({ error: 'Passkey setup session expired. Try again.' }, { status: 400 });
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
		const payload = normalizeWebAuthnRegistration(body.credential);
		const result = await completePasskeyRegistration({
			logtoCookies: passkeyFlow.logtoCookies,
			verificationId: passkeyFlow.verificationId,
			payload,
			forwardedOrigin: url.origin
		});
		clearPasskeyFlowCookies(cookies);
		clearOauthFlowCookies(cookies);
		return json({ success: true, ...result });
	} catch (error) {
		console.error('[passkey/register/verify]', error);
		clearPasskeyFlowCookies(cookies);
		return json({ error: passkeyErrorMessage(error) }, { status: 401 });
	}
};
