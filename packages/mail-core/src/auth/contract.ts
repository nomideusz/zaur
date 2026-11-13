export type StalwartAuthResponse =
	| { type: 'authenticated'; clientCode: string }
	| { type: 'mfaRequired' }
	| { type: 'failure' };

export function parseStalwartAuthResponse(value: unknown): StalwartAuthResponse | null {
	if (!value || typeof value !== 'object') return null;
	const record = value as Record<string, unknown>;
	if (record.type === 'mfaRequired') return { type: 'mfaRequired' };
	if (record.type === 'failure') return { type: 'failure' };
	// Stalwart 0.16 answers with the code, 1.0 with the redirect that carries it.
	const clientCode =
		typeof record.clientCode === 'string'
			? record.clientCode
			: typeof record.client_code === 'string'
				? record.client_code
				: codeFromLocation(record.location);
	if (record.type === 'authenticated' && clientCode) {
		return { type: 'authenticated', clientCode };
	}
	return null;
}

function codeFromLocation(location: unknown): string | null {
	if (typeof location !== 'string') return null;
	try {
		return new URL(location).searchParams.get('code') || null;
	} catch {
		return null;
	}
}

export function describeStalwartAuthResponse(value: unknown): {
	responseType: string | null;
	responseKeys: string[];
} {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return { responseType: null, responseKeys: [] };
	}
	const record = value as Record<string, unknown>;
	const responseType =
		typeof record.type === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(record.type)
			? record.type
			: null;
	return {
		responseType,
		responseKeys: Object.keys(record)
			.filter((key) => /^[A-Za-z0-9_@.-]{1,64}$/.test(key))
			.slice(0, 20)
	};
}

export function createStalwartAuthPayload(input: {
	accountName: string;
	accountSecret: string;
	mfaToken?: string;
	clientId: string;
	redirectUri: string;
	scope: string;
	codeChallenge: string;
}) {
	// 1.0 requires a state, but this flow has no browser redirect for it to
	// protect, so the challenge (already unique per attempt) stands in.
	const state = input.codeChallenge;
	return {
		type: 'authCode',
		accountName: input.accountName,
		accountSecret: input.accountSecret,
		mfaToken: input.mfaToken?.trim() || null,
		// Stalwart 0.16 reads these fields and ignores the two below.
		clientId: input.clientId,
		redirectUri: input.redirectUri,
		scope: input.scope,
		state,
		codeChallenge: input.codeChallenge,
		codeChallengeMethod: 'S256',
		// Stalwart 1.0 reads the authorization request from `query` and ignores
		// the fields above. The person is signing in to this app on its own login
		// page, so there is no third party for a consent screen to name.
		query: authorizationQuery(input),
		consent: true
	} as const;
}

/** The authorization request Stalwart 1.0 reads from a sign-in's `query`. */
function authorizationQuery(input: {
	clientId: string;
	redirectUri: string;
	scope: string;
	codeChallenge: string;
}): string {
	return new URLSearchParams({
		response_type: 'code',
		client_id: input.clientId,
		redirect_uri: input.redirectUri,
		scope: input.scope,
		// No browser redirect for a state to protect: the challenge stands in.
		state: input.codeChallenge,
		code_challenge: input.codeChallenge,
		code_challenge_method: 'S256'
	}).toString();
}

/**
 * A WebAuthn sign-in assertion as Stalwart 1.1 reads it: the browser's
 * `PublicKeyCredential.toJSON()`, every binary field base64url.
 */
export interface PasskeyAssertion {
	id?: string;
	rawId: string;
	type?: string;
	response: {
		clientDataJSON: string;
		authenticatorData: string;
		signature: string;
		userHandle?: string | null;
	};
}

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/**
 * Only the fields Stalwart reads, each base64url and of a sane size, so what
 * a browser sent is checked before it leaves for the server.
 */
export function parsePasskeyAssertion(value: unknown): PasskeyAssertion | null {
	if (!value || typeof value !== 'object') return null;
	const record = value as Record<string, unknown>;
	const response = record.response as Record<string, unknown> | undefined;
	if (!response || typeof response !== 'object') return null;
	const field = (raw: unknown, max: number) =>
		typeof raw === 'string' && raw.length > 0 && raw.length <= max && BASE64URL.test(raw) ? raw : null;
	const rawId = field(record.rawId, 1400);
	const clientDataJSON = field(response.clientDataJSON, 6000);
	const authenticatorData = field(response.authenticatorData, 6000);
	const signature = field(response.signature, 1400);
	const userHandle = response.userHandle == null ? null : field(response.userHandle, 128);
	if (!rawId || !clientDataJSON || !authenticatorData || !signature) return null;
	if (response.userHandle != null && !userHandle) return null;
	return { rawId, type: 'public-key', response: { clientDataJSON, authenticatorData, signature, userHandle } };
}

export function createStalwartPasskeyPayload(input: {
	credential: PasskeyAssertion;
	clientId: string;
	redirectUri: string;
	scope: string;
	codeChallenge: string;
}) {
	return {
		type: 'authCodePasskey',
		credential: input.credential,
		query: authorizationQuery(input),
		// As for the password: signing in to this app on its own page.
		consent: true
	} as const;
}

export type StalwartPasskeyResponse =
	| { type: 'authenticated'; clientCode: string }
	/** The passkey is not (or no longer) on any account. */
	| { type: 'passkeyUnknown' }
	/** The account's main credential expired. */
	| { type: 'expired' }
	| { type: 'failure' };

export function parseStalwartPasskeyResponse(value: unknown): StalwartPasskeyResponse | null {
	if (!value || typeof value !== 'object') return null;
	const record = value as Record<string, unknown>;
	if (record.type === 'passkeyUnknown' || record.type === 'expired' || record.type === 'failure') {
		return { type: record.type };
	}
	const clientCode = record.type === 'authenticated' ? codeFromLocation(record.location) : null;
	return clientCode ? { type: 'authenticated', clientCode } : null;
}

/** The sign-in challenge Stalwart 1.1 hands out (`{type: 'passkeyOptions'}`). */
export interface PasskeySignInOptions {
	challenge: string;
	rpId: string;
	timeout: number;
}

export function parsePasskeyOptions(value: unknown): PasskeySignInOptions | null {
	if (!value || typeof value !== 'object') return null;
	const record = value as Record<string, unknown>;
	if (
		record.type !== 'passkeyOptions' ||
		typeof record.challenge !== 'string' ||
		!BASE64URL.test(record.challenge) ||
		typeof record.rpId !== 'string' ||
		!record.rpId
	) {
		return null;
	}
	const timeout = typeof record.timeout === 'number' && record.timeout > 0 ? record.timeout : 300_000;
	return { challenge: record.challenge, rpId: record.rpId, timeout };
}

export function createTokenSession(input: {
	serverUrl: string;
	username: string;
	accessToken: string;
	refreshToken: string;
	accessTokenExpiresAt: number;
	scope?: string;
}) {
	return {
		serverUrl: input.serverUrl,
		username: input.username,
		authMethod: 'oauth' as const,
		accessToken: input.accessToken,
		refreshToken: input.refreshToken,
		accessTokenExpiresAt: input.accessTokenExpiresAt,
		scope: input.scope
	};
}
