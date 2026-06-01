import { json, type RequestHandler } from '@sveltejs/kit';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';
import {
	PASSKEY_SETUP_COOKIE,
	finishPasskeySetup,
	isPasskeySetupEnabled,
	unsealPasskeySetupSession,
	type WebAuthnRegistrationPayload
} from '$lib/server/logto-experience';

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!isPasskeySetupEnabled()) {
		return json({ error: 'Passkey setup is not available.' }, { status: 503 });
	}

	const clientAddress = getClientAddress(request);
	const limit = checkRateLimit({
		key: `passkey-setup-finish:${clientAddress}`,
		limit: 10,
		windowMs: 15 * 60 * 1000
	});
	if (!limit.allowed) {
		return json(
			{ error: `Too many attempts. Try again in ${limit.retryAfterSec}s.` },
			{ status: 429 }
		);
	}

	const session = unsealPasskeySetupSession(cookies.get(PASSKEY_SETUP_COOKIE));
	if (!session) {
		return json({ error: 'Passkey setup session expired. Start again from registration.' }, {
			status: 400
		});
	}

	let body: { payload?: WebAuthnRegistrationPayload };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body.' }, { status: 400 });
	}

	if (!body.payload?.id || !body.payload.response?.clientDataJSON) {
		return json({ error: 'Missing passkey registration payload.' }, { status: 400 });
	}

	try {
		const origin = request.headers.get('origin') ?? undefined;
		await finishPasskeySetup(session, body.payload, { origin });
		cookies.delete(PASSKEY_SETUP_COOKIE, { path: '/' });
		return json({ success: true, email: session.email });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to save passkey.';
		return json({ error: message }, { status: 400 });
	}
};
