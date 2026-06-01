import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { isOauthEnabled } from '$lib/server/oidc-discovery';

export const PASSKEY_SETUP_COOKIE = 'passkey_setup';
const SETUP_MAX_AGE_SEC = 15 * 60;
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

type CookieJar = Record<string, string>;

export interface PasskeySetupSession {
	logtoCookies: CookieJar;
	email: string;
	registrationVerificationId: string;
	expiresAt: number;
}

interface LogtoRegistrationOptions {
	rp: { name: string; id?: string };
	user: { id: string; name: string; displayName: string };
	challenge: string;
	pubKeyCredParams: Array<{ type: string; alg: number }>;
	timeout?: number;
	excludeCredentials?: Array<{ type: string; id: string; transports?: string[] }>;
	authenticatorSelection?: Record<string, unknown>;
	attestation?: string;
	extensions?: Record<string, unknown>;
}

function getSealKey(): Buffer {
	const secret = env.SESSION_SECRET?.trim();
	if (!secret) {
		throw new Error('SESSION_SECRET is not configured.');
	}
	return createHash('sha256').update(secret).digest();
}

function sealPasskeySetup(session: PasskeySetupSession): string {
	const key = getSealKey();
	const iv = randomBytes(IV_LEN);
	const cipher = createCipheriv(ALGO, key, iv);
	const encrypted = Buffer.concat([
		cipher.update(JSON.stringify(session), 'utf8'),
		cipher.final()
	]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

function unsealPasskeySetup(token: string): PasskeySetupSession | null {
	try {
		const key = getSealKey();
		const buf = Buffer.from(token, 'base64url');
		const iv = buf.subarray(0, IV_LEN);
		const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
		const encrypted = buf.subarray(IV_LEN + TAG_LEN);
		const decipher = createDecipheriv(ALGO, key, iv);
		decipher.setAuthTag(tag);
		const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
			'utf8'
		);
		return JSON.parse(plaintext) as PasskeySetupSession;
	} catch {
		return null;
	}
}

function getLogtoOrigin(): string {
	const issuer = env.OAUTH_ISSUER_URL?.trim().replace(/\/$/, '');
	if (!issuer) {
		throw new Error('OAUTH_ISSUER_URL is not configured.');
	}
	return issuer.replace(/\/oidc$/i, '');
}

function cookieHeader(jar: CookieJar): string | undefined {
	const entries = Object.entries(jar);
	if (!entries.length) return undefined;
	return entries.map(([name, value]) => `${name}=${value}`).join('; ');
}

function applySetCookies(jar: CookieJar, headers: Headers): void {
	const setCookies =
		typeof headers.getSetCookie === 'function'
			? headers.getSetCookie()
			: [headers.get('set-cookie')].filter(Boolean) as string[];

	for (const raw of setCookies) {
		const [pair] = raw.split(';');
		const eq = pair.indexOf('=');
		if (eq <= 0) continue;
		const name = pair.slice(0, eq).trim();
		const value = pair.slice(eq + 1).trim();
		if (value) {
			jar[name] = value;
		} else {
			delete jar[name];
		}
	}
}

async function experienceRequest<T = unknown>(
	jar: CookieJar,
	path: string,
	init: RequestInit = {}
): Promise<{ body: T; status: number }> {
	const headers = new Headers(init.headers);
	headers.set('Content-Type', 'application/json');
	const cookies = cookieHeader(jar);
	if (cookies) {
		headers.set('Cookie', cookies);
	}

	const response = await fetch(`${getLogtoOrigin()}${path}`, {
		...init,
		headers
	});

	applySetCookies(jar, response.headers);

	const body = (await response.json().catch(() => ({}))) as T & {
		message?: string;
		code?: string;
		data?: { message?: string; code?: string };
	};

	if (!response.ok) {
		const detail =
			body.data?.message ||
			body.message ||
			body.code ||
			body.data?.code ||
			`Logto experience request failed (${response.status})`;
		throw new Error(detail);
	}

	return { body, status: response.status };
}

export function isPasskeySetupEnabled(): boolean {
	return isOauthEnabled();
}

export function sealPasskeySetupSession(session: PasskeySetupSession): string {
	return sealPasskeySetup(session);
}

export function unsealPasskeySetupSession(token: string | undefined): PasskeySetupSession | null {
	if (!token) return null;
	const session = unsealPasskeySetup(token);
	if (!session?.email || !session.registrationVerificationId || !session.logtoCookies) {
		return null;
	}
	if (session.expiresAt <= Date.now()) {
		return null;
	}
	return session;
}

export async function beginPasskeySetup(email: string, token: string): Promise<{
	session: PasskeySetupSession;
	registrationOptions: LogtoRegistrationOptions;
}> {
	const normalizedEmail = email.trim().toLowerCase();
	const cleanToken = token.trim();
	if (!normalizedEmail || !cleanToken) {
		throw new Error('Email and setup token are required.');
	}

	const jar: CookieJar = {};

	await experienceRequest(jar, '/api/experience', {
		method: 'PUT',
		body: JSON.stringify({ interactionEvent: 'SignIn' })
	});

	const verify = await experienceRequest<{ verificationId: string }>(
		jar,
		'/api/experience/verification/one-time-token/verify',
		{
			method: 'POST',
			body: JSON.stringify({
				identifier: { type: 'email', value: normalizedEmail },
				token: cleanToken
			})
		}
	);

	await experienceRequest(jar, '/api/experience/identification', {
		method: 'POST',
		body: JSON.stringify({ verificationId: verify.body.verificationId })
	});

	const registration = await experienceRequest<{
		verificationId: string;
		registrationOptions: LogtoRegistrationOptions;
	}>(jar, '/api/experience/verification/web-authn/registration', {
		method: 'POST',
		body: JSON.stringify({})
	});

	const session: PasskeySetupSession = {
		logtoCookies: jar,
		email: normalizedEmail,
		registrationVerificationId: registration.body.verificationId,
		expiresAt: Date.now() + SETUP_MAX_AGE_SEC * 1000
	};

	return {
		session,
		registrationOptions: registration.body.registrationOptions
	};
}

export interface WebAuthnRegistrationPayload {
	type: string;
	id: string;
	rawId: string;
	response: {
		clientDataJSON: string;
		attestationObject: string;
		authenticatorData?: string;
		transports?: string[];
		publicKeyAlgorithm?: number;
		publicKey?: string;
	};
	authenticatorAttachment?: 'cross-platform' | 'platform';
	clientExtensionResults: Record<string, unknown>;
}

export async function finishPasskeySetup(
	session: PasskeySetupSession,
	payload: WebAuthnRegistrationPayload
): Promise<void> {
	const jar = { ...session.logtoCookies };

	const verified = await experienceRequest<{ verificationId: string }>(
		jar,
		'/api/experience/verification/web-authn/registration/verify',
		{
			method: 'POST',
			body: JSON.stringify({
				verificationId: session.registrationVerificationId,
				payload
			})
		}
	);

	await experienceRequest(jar, '/api/experience/profile/mfa/passkey', {
		method: 'POST',
		body: JSON.stringify({ verificationId: verified.body.verificationId })
	});
}

export { SETUP_MAX_AGE_SEC };
