import { env } from '$env/dynamic/private';
import { createHash, randomBytes } from 'node:crypto';
import { getOidcDiscovery, getOidcIssuerUrl } from '$lib/server/oidc-discovery';
import { buildAuthorizationUrl } from '$lib/server/oauth';

const LOGTO_WEBAUTHN_TYPE = 'WebAuthn';

function logtoOrigin(): string {
	const issuer = getOidcIssuerUrl()?.replace(/\/$/, '') ?? '';
	return issuer.replace(/\/oidc$/, '');
}

function clientId(): string {
	return (env.OAUTH_CLIENT_ID || 'webmail').trim();
}

function randomString(bytes = 32): string {
	return randomBytes(bytes).toString('base64url');
}

function challengeFromVerifier(verifier: string): string {
	return createHash('sha256').update(verifier).digest('base64url');
}

export function encodeLogtoCookieJar(jar: Map<string, string>): string {
	return Buffer.from(JSON.stringify(Object.fromEntries(jar)), 'utf8').toString('base64url');
}

export function decodeLogtoCookieJar(encoded: string): Map<string, string> {
	const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<
		string,
		string
	>;
	return new Map(Object.entries(parsed));
}

function forwardedHeaders(forwardedOrigin: string): Record<string, string> {
	const { host, protocol } = new URL(forwardedOrigin);
	return {
		'X-Forwarded-Host': host,
		'X-Forwarded-Proto': protocol.replace(':', '')
	};
}

function mergeSetCookies(jar: Map<string, string>, response: Response) {
	const setCookies =
		typeof response.headers.getSetCookie === 'function'
			? response.headers.getSetCookie()
			: [response.headers.get('set-cookie')].filter(Boolean) as string[];

	for (const raw of setCookies) {
		const nameValue = raw.split(';')[0]?.trim();
		if (!nameValue) continue;
		const eq = nameValue.indexOf('=');
		if (eq <= 0) continue;
		jar.set(nameValue.slice(0, eq), nameValue.slice(eq + 1));
	}
}

function serializeCookies(jar: Map<string, string>): string {
	return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function logtoFetch(
	path: string,
	jar: Map<string, string>,
	forwardedOrigin: string,
	init: RequestInit & { json?: unknown } = {}
): Promise<Response> {
	const url = `${logtoOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
	const headers = new Headers(init.headers);
	headers.set('Logto-App-Id', clientId());
	for (const [key, value] of Object.entries(forwardedHeaders(forwardedOrigin))) {
		headers.set(key, value);
	}
	const cookie = serializeCookies(jar);
	if (cookie) headers.set('Cookie', cookie);
	if (init.json !== undefined) {
		headers.set('Content-Type', 'application/json');
	}

	const response = await fetch(url, {
		...init,
		headers,
		body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
		redirect: 'manual'
	});
	mergeSetCookies(jar, response);
	return response;
}

async function bootstrapInteraction(
	jar: Map<string, string>,
	authUrl: string,
	forwardedOrigin: string
) {
	let url: string | null = authUrl;
	for (let i = 0; i < 8 && url; i++) {
		const response = await fetch(url, {
			redirect: 'manual',
			headers: {
				Cookie: serializeCookies(jar),
				'Logto-App-Id': clientId(),
				...forwardedHeaders(forwardedOrigin)
			}
		});
		mergeSetCookies(jar, response);
		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			if (!location) {
				url = null;
				continue;
			}
			url = new URL(location, url).href;
			continue;
		}
		break;
	}
}

async function readJson<T>(response: Response): Promise<T> {
	const text = await response.text();
	if (!response.ok) {
		let message = text;
		let code: string | undefined;
		try {
			const parsed = JSON.parse(text) as {
				message?: string;
				error_description?: string;
				code?: string;
			};
			code = parsed.code;
			message = parsed.message ?? parsed.error_description ?? text;
		} catch {
			// keep raw text
		}
		const error = new Error(message || `Logto request failed (${response.status})`);
		if (code) {
			(error as Error & { code?: string }).code = code;
		}
		throw error;
	}
	return text ? (JSON.parse(text) as T) : ({} as T);
}

export function isNoPasskeyRegisteredError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const code = (error as Error & { code?: string }).code;
	return (
		code === 'session.mfa.webauthn_verification_not_found' ||
		/WebAuthn verification not found/i.test(error.message)
	);
}

export function passkeyErrorMessage(error: unknown): string {
	if (isNoPasskeyRegisteredError(error)) {
		return 'No passkey is registered for this account. Sign in with your password first, then add a passkey from Settings.';
	}
	if (error instanceof Error) return error.message;
	return 'Passkey sign-in failed.';
}

export type PasskeyBeginResult = {
	verificationId?: string;
	discoverable: boolean;
	authenticationOptions: Record<string, unknown>;
	oauth: {
		state: string;
		codeVerifier: string;
		redirectUri: string;
	};
	logtoCookies: string;
};

async function initSignInInteraction(jar: Map<string, string>, forwardedOrigin: string) {
	await logtoFetch('/api/experience', jar, forwardedOrigin, {
		method: 'PUT',
		json: { interactionEvent: 'SignIn' }
	}).then(async (res) => {
		if (res.status !== 204 && !res.ok) {
			await readJson(res);
		}
	});
}

export async function beginPasskeySignIn(input: {
	email: string;
	redirectUri: string;
	forwardedOrigin: string;
}): Promise<PasskeyBeginResult> {
	await getOidcDiscovery();
	const jar = new Map<string, string>();
	const state = randomString(32);
	const codeVerifier = randomString(48);
	const codeChallenge = challengeFromVerifier(codeVerifier);

	const authUrl = await buildAuthorizationUrl({
		redirectUri: input.redirectUri,
		state,
		codeChallenge,
		loginHint: input.email
	});

	await bootstrapInteraction(jar, authUrl, input.forwardedOrigin);

	try {
		await initSignInInteraction(jar, input.forwardedOrigin);

		const auth = await logtoFetch(
			'/api/experience/verification/sign-in-passkey/authentication',
			jar,
			input.forwardedOrigin,
			{
				method: 'POST',
				json: {
					identifier: { type: 'email', value: input.email }
				}
			}
		).then((res) =>
			readJson<{ verificationId: string; authenticationOptions: Record<string, unknown> }>(res)
		);

		return {
			verificationId: auth.verificationId,
			discoverable: false,
			authenticationOptions: auth.authenticationOptions,
			oauth: { state, codeVerifier, redirectUri: input.redirectUri },
			logtoCookies: encodeLogtoCookieJar(jar)
		};
	} catch (error) {
		if (!isNoPasskeyRegisteredError(error)) {
			throw error;
		}
		return beginDiscoverablePasskeySignIn({
			jar,
			state,
			codeVerifier,
			redirectUri: input.redirectUri,
			forwardedOrigin: input.forwardedOrigin
		});
	}
}

async function beginDiscoverablePasskeySignIn(input: {
	jar: Map<string, string>;
	state: string;
	codeVerifier: string;
	redirectUri: string;
	forwardedOrigin: string;
}): Promise<PasskeyBeginResult> {
	const auth = await logtoFetch(
		'/api/experience/preflight/sign-in-passkey/authentication',
		input.jar,
		input.forwardedOrigin,
		{ method: 'POST' }
	).then((res) => readJson<{ authenticationOptions: Record<string, unknown> }>(res));

	return {
		discoverable: true,
		authenticationOptions: auth.authenticationOptions,
		oauth: {
			state: input.state,
			codeVerifier: input.codeVerifier,
			redirectUri: input.redirectUri
		},
		logtoCookies: encodeLogtoCookieJar(input.jar)
	};
}

export type WebAuthnAssertionPayload = {
	type: typeof LOGTO_WEBAUTHN_TYPE;
	id: string;
	rawId: string;
	authenticatorAttachment?: string;
	clientExtensionResults?: Record<string, unknown>;
	response: {
		clientDataJSON: string;
		authenticatorData: string;
		signature: string;
		userHandle?: string | null;
	};
};

export function normalizeWebAuthnCredential(
	credential: Record<string, unknown>
): WebAuthnAssertionPayload {
	const response = credential.response as WebAuthnAssertionPayload['response'] | undefined;
	if (!credential.id || !response?.clientDataJSON) {
		throw new Error('Missing passkey response.');
	}

	return {
		type: LOGTO_WEBAUTHN_TYPE,
		id: String(credential.id),
		rawId: String(credential.rawId ?? credential.id),
		authenticatorAttachment: credential.authenticatorAttachment as string | undefined,
		clientExtensionResults:
			(credential.clientExtensionResults as Record<string, unknown> | undefined) ?? {},
		response: {
			clientDataJSON: response.clientDataJSON,
			authenticatorData: response.authenticatorData,
			signature: response.signature,
			userHandle: response.userHandle ?? null
		}
	};
}

export async function completePasskeySignIn(input: {
	logtoCookies: string;
	verificationId?: string;
	discoverable: boolean;
	payload: WebAuthnAssertionPayload;
	forwardedOrigin: string;
}): Promise<{ code: string; state: string }> {
	const jar = decodeLogtoCookieJar(input.logtoCookies);

	if (input.discoverable) {
		await initSignInInteraction(jar, input.forwardedOrigin);
	}

	const verifyBody = input.discoverable
		? { payload: input.payload }
		: { verificationId: input.verificationId, payload: input.payload };

	const verify = await logtoFetch(
		'/api/experience/verification/sign-in-passkey/authentication/verify',
		jar,
		input.forwardedOrigin,
		{
			method: 'POST',
			json: verifyBody
		}
	).then((res) => readJson<{ verificationId: string }>(res));

	await logtoFetch('/api/experience/identification', jar, input.forwardedOrigin, {
		method: 'POST',
		json: { verificationId: verify.verificationId }
	}).then(async (res) => {
		if (!res.ok) await readJson(res);
	});

	const submit = await logtoFetch('/api/experience/submit', jar, input.forwardedOrigin, {
		method: 'POST'
	}).then((res) => readJson<{ redirectTo: string }>(res));

	const callbackUrl = await followForAuthorizationCode(jar, submit.redirectTo);
	const parsed = new URL(callbackUrl);
	const code = parsed.searchParams.get('code');
	const state = parsed.searchParams.get('state');
	if (!code || !state) {
		throw new Error('Passkey sign-in did not return an authorization code.');
	}
	return { code, state };
}

async function followForAuthorizationCode(jar: Map<string, string>, startUrl: string): Promise<string> {
	let url: string | null = startUrl;
	for (let i = 0; i < 10 && url; i++) {
		if (url.includes('code=')) return url;
		const response = await fetch(url, {
			redirect: 'manual',
			headers: { Cookie: serializeCookies(jar) }
		});
		mergeSetCookies(jar, response);
		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			if (!location) break;
			url = new URL(location, url).href;
			continue;
		}
		break;
	}
	throw new Error('Could not resolve authorization callback URL after passkey sign-in.');
}
