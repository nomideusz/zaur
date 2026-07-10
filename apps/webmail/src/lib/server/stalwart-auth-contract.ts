export type StalwartAuthResponse =
	| { type: 'authenticated'; clientCode: string }
	| { type: 'mfaRequired' }
	| { type: 'failure' };

export function parseStalwartAuthResponse(value: unknown): StalwartAuthResponse | null {
	if (!value || typeof value !== 'object') return null;
	const record = value as Record<string, unknown>;
	if (record.type === 'mfaRequired') return { type: 'mfaRequired' };
	if (record.type === 'failure') return { type: 'failure' };
	const clientCode =
		typeof record.clientCode === 'string'
			? record.clientCode
			: typeof record.client_code === 'string'
				? record.client_code
				: null;
	if (record.type === 'authenticated' && clientCode) {
		return { type: 'authenticated', clientCode };
	}
	return null;
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
	return {
		type: 'authCode',
		accountName: input.accountName,
		accountSecret: input.accountSecret,
		mfaToken: input.mfaToken?.trim() || null,
		clientId: input.clientId,
		redirectUri: input.redirectUri,
		scope: input.scope,
		codeChallenge: input.codeChallenge,
		codeChallengeMethod: 'S256'
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
