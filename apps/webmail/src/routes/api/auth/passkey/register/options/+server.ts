import { json, type RequestHandler } from '@sveltejs/kit';
import { beginPasskeyRegistration, passkeyErrorMessage } from '$lib/server/logto-experience';
import { isOauthEnabled } from '$lib/server/oidc-discovery';
import {
	clearPasskeyFlowCookies,
	setOauthFlowCookies,
	PASSKEY_LOGTO_COOKIE,
	PASSKEY_VERIFICATION_COOKIE,
	PASSKEY_FLOW_COOKIE
} from '$lib/server/oauth-flow';
import { readSession } from '$lib/server/session';
import { normalizeEmail } from '$lib/jmap/account';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';

const passkeyCookieOpts = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: process.env.NODE_ENV === 'production',
	maxAge: 10 * 60
};

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	if (!isOauthEnabled()) {
		return json({ error: 'Passkey setup is not configured.' }, { status: 503 });
	}

	const clientAddress = getClientAddress(request);
	const limit = checkRateLimit({
		key: `passkey-register-options:${clientAddress}`,
		limit: 10,
		windowMs: 15 * 60 * 1000
	});
	if (!limit.allowed) {
		return json(
			{ error: `Too many attempts. Try again in ${limit.retryAfterSec}s.` },
			{ status: 429 }
		);
	}

	let body: { email?: string; password?: string; token?: string; rememberMe?: boolean; redirectTo?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const email = normalizeEmail(body.email ?? '');
	if (!email || !email.includes('@')) {
		return json({ error: 'Enter a valid email address.' }, { status: 400 });
	}

	const token = body.token?.trim();
	const password = body.password;
	const session = readSession(cookies);

	if (token) {
		// Post-registration setup — token proves identity.
	} else if (password) {
		if (!session?.username || normalizeEmail(session.username) !== email) {
			return json({ error: 'Sign in before adding a passkey to this account.' }, { status: 401 });
		}
	} else {
		return json({ error: 'Password or setup token is required.' }, { status: 400 });
	}

	const redirectTo =
		body.redirectTo?.startsWith('/') && !body.redirectTo.startsWith('//')
			? body.redirectTo
			: undefined;

	try {
		clearPasskeyFlowCookies(cookies);

		const redirectUri = `${url.origin}/oauth/callback`;
		const result = await beginPasskeyRegistration({
			email,
			forwardedOrigin: url.origin,
			redirectUri,
			oneTimeToken: token,
			password: token ? undefined : password
		});

		if (result.oauth) {
			setOauthFlowCookies(cookies, {
				codeVerifier: result.oauth.codeVerifier,
				state: result.oauth.state,
				rememberMe: body.rememberMe === true,
				redirectTo
			});
		}

		cookies.set(PASSKEY_LOGTO_COOKIE, result.logtoCookies, passkeyCookieOpts);
		cookies.set(PASSKEY_FLOW_COOKIE, 'register', passkeyCookieOpts);
		cookies.set(PASSKEY_VERIFICATION_COOKIE, result.verificationId, passkeyCookieOpts);

		return json({
			registrationOptions: result.registrationOptions
		});
	} catch (error) {
		console.error('[passkey/register/options]', error);
		clearPasskeyFlowCookies(cookies);
		return json({ error: passkeyErrorMessage(error) }, { status: 502 });
	}
};
