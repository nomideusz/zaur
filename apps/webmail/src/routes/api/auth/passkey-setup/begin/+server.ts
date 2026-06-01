import { json, type RequestHandler } from '@sveltejs/kit';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';
import {
	SETUP_MAX_AGE_SEC,
	PASSKEY_SETUP_COOKIE,
	beginPasskeySetup,
	isPasskeySetupEnabled,
	sealPasskeySetupSession
} from '$lib/server/logto-experience';

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!isPasskeySetupEnabled()) {
		return json({ error: 'Passkey setup is not available.' }, { status: 503 });
	}

	const clientAddress = getClientAddress(request);
	const limit = checkRateLimit({
		key: `passkey-setup-begin:${clientAddress}`,
		limit: 10,
		windowMs: 15 * 60 * 1000
	});
	if (!limit.allowed) {
		return json(
			{ error: `Too many attempts. Try again in ${limit.retryAfterSec}s.` },
			{ status: 429 }
		);
	}

	let body: { email?: string; token?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body.' }, { status: 400 });
	}

	const email = body.email?.trim().toLowerCase();
	const token = body.token?.trim();
	if (!email || !token) {
		return json({ error: 'Email and setup token are required.' }, { status: 400 });
	}

	try {
		const { session, registrationOptions } = await beginPasskeySetup(email, token);
		cookies.set(PASSKEY_SETUP_COOKIE, sealPasskeySetupSession(session), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: SETUP_MAX_AGE_SEC
		});

		return json({ registrationOptions });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unable to start passkey setup.';
		return json({ error: message }, { status: 400 });
	}
};
