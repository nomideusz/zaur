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
		query: new URLSearchParams({
			response_type: 'code',
			client_id: input.clientId,
			redirect_uri: input.redirectUri,
			scope: input.scope,
			state,
			code_challenge: input.codeChallenge,
			code_challenge_method: 'S256'
		}).toString(),
		consent: true
	} as const;
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
