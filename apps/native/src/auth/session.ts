import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import {
	authenticateWithCredentials,
	refreshOauthTokens,
	type CredentialAuthResult,
	type OauthTokens,
	type PkceCrypto
} from '@zaur/mail-core/auth/stalwart';
import { JMAPClient, setJmapUnauthorizedListener } from '@zaur/mail-core/jmap/client';
import { config } from '../config';

const KEY_USERNAME = 'zaur.username';
const KEY_REFRESH_TOKEN = 'zaur.refreshToken';

const pkceCrypto: PkceCrypto = {
	randomBytes: (length) => Crypto.getRandomBytes(length),
	sha256: async (data) => {
		const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(data));
		return new Uint8Array(digest);
	}
};

let username: string | null = null;
let tokens: OauthTokens | null = null;
let client: JMAPClient | null = null;

async function persist(nextUsername: string, nextTokens: OauthTokens): Promise<void> {
	username = nextUsername;
	tokens = nextTokens;
	await SecureStore.setItemAsync(KEY_USERNAME, nextUsername);
	await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, nextTokens.refreshToken);
}

async function refreshAccessToken(): Promise<string | null> {
	if (!tokens) return null;
	try {
		const next = await refreshOauthTokens({
			issuer: config.issuer,
			clientId: config.oauthClientId,
			refreshToken: tokens.refreshToken
		});
		await persist(username!, next);
		return next.accessToken;
	} catch {
		return null;
	}
}

function buildClient(): JMAPClient {
	client = new JMAPClient(
		config.issuer,
		username!,
		tokens!.accessToken,
		false,
		true,
		refreshAccessToken
	);
	return client;
}

export function getClient(): JMAPClient {
	if (!client) throw new Error('Not signed in');
	return client;
}

export type LoginResult = 'ok' | 'mfa_required' | 'failure';

export async function login(
	accountName: string,
	accountSecret: string,
	mfaToken?: string
): Promise<LoginResult> {
	const result: CredentialAuthResult = await authenticateWithCredentials({
		issuer: config.issuer,
		clientId: config.oauthClientId,
		redirectUri: config.oauthRedirectUri,
		accountName,
		accountSecret,
		mfaToken,
		crypto: pkceCrypto
	});
	if (result.status !== 'authenticated') {
		return result.status === 'mfa_required' ? 'mfa_required' : 'failure';
	}
	await persist(accountName, result.tokens);
	const jmap = buildClient();
	await jmap.connect();
	return 'ok';
}

/** Restore a session from the stored refresh token. Returns true when signed in. */
export async function restoreSession(): Promise<boolean> {
	const [storedUsername, storedRefreshToken] = await Promise.all([
		SecureStore.getItemAsync(KEY_USERNAME),
		SecureStore.getItemAsync(KEY_REFRESH_TOKEN)
	]);
	if (!storedUsername || !storedRefreshToken) return false;
	username = storedUsername;
	tokens = {
		accessToken: '',
		refreshToken: storedRefreshToken,
		accessTokenExpiresAt: 0
	};
	const accessToken = await refreshAccessToken();
	if (!accessToken) {
		await logout();
		return false;
	}
	const jmap = buildClient();
	try {
		await jmap.connect();
	} catch {
		return false;
	}
	return true;
}

export async function logout(): Promise<void> {
	username = null;
	tokens = null;
	client = null;
	await SecureStore.deleteItemAsync(KEY_USERNAME);
	await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);
}

export function getUsername(): string | null {
	return username;
}

/** Wire the JMAP client's unauthorized signal (refresh failed) to a sign-out handler. */
export function onUnauthorized(handler: () => void): void {
	setJmapUnauthorizedListener(handler);
}
