import { json, type RequestHandler } from '@sveltejs/kit';
import { beginPasskeySignIn, passkeyErrorMessage } from '$lib/server/logto-experience';
import { isOauthEnabled } from '$lib/server/oidc-discovery';
import {
	clearPasskeyFlowCookies,
	setOauthFlowCookies,
	PASSKEY_LOGTO_COOKIE,
	PASSKEY_VERIFICATION_COOKIE,
	PASSKEY_DISCOVERABLE_COOKIE
} from '$lib/server/oauth-flow';
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
		return json({ error: 'Passkey sign-in is not configured.' }, { status: 503 });
	}

	const clientAddress = getClientAddress(request);
	const limit = checkRateLimit({
		key: `passkey-options:${clientAddress}`,
		limit: 20,
		windowMs: 15 * 60 * 1000
	});
	if (!limit.allowed) {
		return json(
			{ error: `Too many sign-in attempts. Try again in ${limit.retryAfterSec}s.` },
			{ status: 429 }
		);
	}

	let body: { email?: string; rememberMe?: boolean; redirectTo?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const email = body.email?.trim().toLowerCase();
	if (!email || !email.includes('@')) {
		return json({ error: 'Enter a valid email address.' }, { status: 400 });
	}

	const redirectTo =
		body.redirectTo?.startsWith('/') && !body.redirectTo.startsWith('//')
			? body.redirectTo
			: undefined;

	try {
		clearPasskeyFlowCookies(cookies);

		const redirectUri = `${url.origin}/oauth/callback`;
		const result = await beginPasskeySignIn({
			email,
			redirectUri,
			forwardedOrigin: url.origin
		});

		setOauthFlowCookies(cookies, {
			codeVerifier: result.oauth.codeVerifier,
			state: result.oauth.state,
			rememberMe: body.rememberMe === true,
			redirectTo
		});
		cookies.set(PASSKEY_LOGTO_COOKIE, result.logtoCookies, passkeyCookieOpts);
		cookies.set(PASSKEY_DISCOVERABLE_COOKIE, result.discoverable ? '1' : '0', passkeyCookieOpts);
		if (result.verificationId) {
			cookies.set(PASSKEY_VERIFICATION_COOKIE, result.verificationId, passkeyCookieOpts);
		} else {
			cookies.delete(PASSKEY_VERIFICATION_COOKIE, { path: '/' });
		}

		return json({
			authenticationOptions: result.authenticationOptions,
			discoverable: result.discoverable
		});
	} catch (error) {
		console.error('[passkey/options]', error);
		clearPasskeyFlowCookies(cookies);
		return json({ error: passkeyErrorMessage(error) }, { status: 502 });
	}
};
