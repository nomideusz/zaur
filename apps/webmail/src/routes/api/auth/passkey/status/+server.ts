import { json, type RequestHandler } from '@sveltejs/kit';
import { checkRegisteredPasskey } from '$lib/server/logto-experience';
import { isOauthEnabled } from '$lib/server/oidc-discovery';
import { normalizeEmail } from '$lib/jmap/account';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';
import { readSession } from '$lib/server/session';

export const GET: RequestHandler = async ({ cookies, request, url }) => {
	if (!isOauthEnabled()) {
		return json({ registered: false });
	}

	const session = readSession(cookies);
	if (!session?.username) {
		return json({ error: 'Sign in to view passkey status.' }, { status: 401 });
	}

	const clientAddress = getClientAddress(request);
	const limit = checkRateLimit({
		key: `passkey-status:${clientAddress}`,
		limit: 30,
		windowMs: 15 * 60 * 1000
	});
	if (!limit.allowed) {
		return json(
			{ error: `Too many attempts. Try again in ${limit.retryAfterSec}s.` },
			{ status: 429 }
		);
	}

	const email = normalizeEmail(session.username);
	if (!email.includes('@')) {
		return json({ error: 'Invalid session email.' }, { status: 400 });
	}

	try {
		const registered = await checkRegisteredPasskey({
			email,
			forwardedOrigin: url.origin,
			redirectUri: `${url.origin}/oauth/callback`
		});
		return json({ registered });
	} catch (error) {
		console.error('[passkey/status]', error);
		return json({ error: 'Could not check passkey status.' }, { status: 502 });
	}
};
