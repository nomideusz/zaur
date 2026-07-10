import { accountKey, updateAccountTokens, type SessionData } from './session';
import { getStoreDb } from './store-instance';
import { hasStepUpProof, putStepUpProof } from './store-db';
import { authenticateStalwartCredentials } from './stalwart-auth';

const STEP_UP_TTL_MS = 5 * 60_000;

export function hasRecentStepUp(account: SessionData): boolean {
	return Boolean(
		account.id &&
			hasStepUpProof(getStoreDb(), account.id, accountKey(account.username), Date.now())
	);
}

export async function performStepUp(input: {
	account: SessionData;
	password: string;
	totp?: string;
	requestOrigin: string;
}): Promise<'verified' | 'mfa_required' | 'failure'> {
	const result = await authenticateStalwartCredentials({
		accountName: input.account.username,
		accountSecret: input.password,
		mfaToken: input.totp,
		requestOrigin: input.requestOrigin
	});
	if (result.status !== 'authenticated') return result.status;
	if (!input.account.id) return 'failure';

	const next: SessionData = {
		...input.account,
		authMethod: 'oauth',
		password: undefined,
		accessToken: result.tokens.accessToken,
		refreshToken: result.tokens.refreshToken,
		accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
		scope: result.tokens.scope ?? input.account.scope
	};
	updateAccountTokens(input.account.id, next);
	const now = Date.now();
	putStepUpProof(
		getStoreDb(),
		input.account.id,
		accountKey(input.account.username),
		now,
		now + STEP_UP_TTL_MS
	);
	return 'verified';
}
