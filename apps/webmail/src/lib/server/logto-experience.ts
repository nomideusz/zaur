import { env } from '$env/dynamic/private';
import { createHash, randomBytes } from 'node:crypto';
import { getOidcDiscovery, getOidcIssuerUrl } from '$lib/server/oidc-discovery';
import { buildAuthorizationUrl } from '$lib/server/oauth';

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

function parseCookieHeader(header: string): Map<string, string> {
	const jar = new Map<string, string>();
	for (const part of header.split(';')) {
		const trimmed = part.trim();
		const eq = trimmed.indexOf('=');
		if (eq <= 0) continue;
		jar.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
	}
	return jar;
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
	init: RequestInit & { json?: unknown } = {}
): Promise<Response> {
	const url = `${logtoOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
	const headers = new Headers(init.headers);
	headers.set('Logto-App-Id', clientId());
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

async function bootstrapInteraction(jar: Map<string, string>, authUrl: string) {
	let url: string | null = authUrl;
	for (let i = 0; i < 8 && url; i++) {
		const response = await fetch(url, {
			redirect: 'manual',
			headers: {
				Cookie: serializeCookies(jar),
				'Logto-App-Id': clientId()
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
		try {
			const parsed = JSON.parse(text) as { message?: string; error_description?: string };
			message = parsed.message ?? parsed.error_description ?? text;
		} catch {
			// keep raw text
		}
		throw new Error(message || `Logto request failed (${response.status})`);
	}
	return text ? (JSON.parse(text) as T) : ({} as T);
}

export type PasskeyBeginResult = {
	verificationId: string;
	authenticationOptions: Record<string, unknown>;
	oauth: {
		state: string;
		codeVerifier: string;
		redirectUri: string;
	};
	logtoCookies: string;
};

export async function beginPasskeySignIn(
	email: string,
	redirectUri: string
): Promise<PasskeyBeginResult> {
	await getOidcDiscovery();
	const jar = new Map<string, string>();
	const state = randomString(32);
	const codeVerifier = randomString(48);
	const codeChallenge = challengeFromVerifier(codeVerifier);

	const authUrl = await buildAuthorizationUrl({
		redirectUri,
		state,
		codeChallenge,
		loginHint: email
	});

	await bootstrapInteraction(jar, authUrl);

	await logtoFetch('/api/experience', jar, {
		method: 'PUT',
		json: { interactionEvent: 'SignIn' }
	}).then(async (res) => {
		if (res.status !== 204 && !res.ok) {
			await readJson(res);
		}
	});

	const auth = await logtoFetch('/api/experience/verification/sign-in-passkey/authentication', jar, {
		method: 'POST',
		json: {
			identifier: { type: 'email', value: email }
		}
	}).then((res) =>
		readJson<{ verificationId: string; authenticationOptions: Record<string, unknown> }>(res)
	);

	return {
		verificationId: auth.verificationId,
		authenticationOptions: auth.authenticationOptions,
		oauth: { state, codeVerifier, redirectUri },
		logtoCookies: serializeCookies(jar)
	};
}

export type WebAuthnAssertionPayload = {
	type: 'WebAuthn';
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

export async function completePasskeySignIn(input: {
	logtoCookies: string;
	verificationId: string;
	payload: WebAuthnAssertionPayload;
}): Promise<{ code: string; state: string }> {
	const jar = parseCookieHeader(input.logtoCookies);

	await logtoFetch('/api/experience/verification/sign-in-passkey/authentication/verify', jar, {
		method: 'POST',
		json: {
			verificationId: input.verificationId,
			payload: input.payload
		}
	}).then((res) => readJson(res));

	await logtoFetch('/api/experience/identification', jar, {
		method: 'POST',
		json: { verificationId: input.verificationId }
	}).then(async (res) => {
		if (!res.ok) await readJson(res);
	});

	const submit = await logtoFetch('/api/experience/submit', jar, {
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
