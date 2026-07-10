import { randomBytes } from 'node:crypto';
import type { JMAPMethodCall, JMAPResponse } from '$lib/jmap/types';
import { getFreshOauthSession } from './jmap';
import { accountKey, type SessionData } from './session';
import { consumeTotpSetup, putTotpSetup } from './store-db';
import { getStoreDb } from './store-instance';
import { sealSession, unsealSession } from './session-crypto';
import { credentialPermissions, extractOneTimeCredential } from './account-security-contract';
import { getStalwartOauthIssuer } from './oauth-config';

const MANAGEMENT_USING = ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'];
const TOTP_SETUP_TTL_MS = 10 * 60_000;

type CredentialType = 'AppPassword' | 'ApiKey';

function methodData(response: JMAPResponse, callId: string): Record<string, unknown> {
	const call = response.methodResponses.find((item) => item[2] === callId);
	if (!call || call[0] === 'error') throw new Error('Stalwart account-security request failed');
	return call[1];
}

async function request(account: SessionData, methodCalls: JMAPMethodCall[]): Promise<JMAPResponse> {
	let current = await getFreshOauthSession(account);
	const send = (accessToken: string) =>
		fetch(new URL('/api', getStalwartOauthIssuer()), {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify({ using: MANAGEMENT_USING, methodCalls }),
			signal: AbortSignal.timeout(10_000)
		});
	let response = await send(current.accessToken!);
	if (response.status === 401) {
		current = await getFreshOauthSession(current, true);
		response = await send(current.accessToken!);
	}
	if (!response.ok) throw new Error('Stalwart account-security request failed');
	const body = (await response.json()) as JMAPResponse;
	if (!Array.isArray(body.methodResponses)) {
		throw new Error('Invalid Stalwart account-security response');
	}
	return body;
}

async function queryCredentials(account: SessionData, type: CredentialType) {
	const query = methodData(
		await request(account, [[`x:${type}/query`, { filter: {} }, 'query']]),
		'query'
	);
	const ids = Array.isArray(query.ids) ? (query.ids as string[]) : [];
	if (!ids.length) return [];
	const get = methodData(
		await request(account, [
			[
				`x:${type}/get`,
				{ ids, properties: ['id', 'description', 'createdAt', 'expiresAt', 'allowedIps', 'permissions'] },
				'get'
			]
		]),
		'get'
	);
	return Array.isArray(get.list) ? get.list : [];
}

export async function getAccountSecurityOverview(account: SessionData) {
	const password = methodData(
		await request(account, [
			['x:AccountPassword/get', { ids: ['singleton'], properties: ['id', 'otpAuth'] }, 'password']
		]),
		'password'
	);
	const passwordRecord = Array.isArray(password.list)
		? (password.list[0] as { otpAuth?: { otpUrl?: string | null } } | undefined)
		: undefined;
	const [appPasswords, apiKeys] = await Promise.all([
		queryCredentials(account, 'AppPassword'),
		queryCredentials(account, 'ApiKey')
	]);
	return {
		totpEnabled: Boolean(passwordRecord?.otpAuth?.otpUrl),
		appPasswords,
		apiKeys
	};
}

function assertSetSucceeded(data: Record<string, unknown>, operation: 'updated' | 'created' | 'destroyed') {
	if (operation === 'updated' && Array.isArray(data.updated) && data.updated.includes('singleton')) return;
	if (operation === 'destroyed' && Array.isArray(data.destroyed) && data.destroyed.length) return;
	if (operation === 'created' && data.created && typeof data.created === 'object') return;
	throw new Error('Stalwart rejected the account-security change');
}

export async function changeAccountPassword(
	account: SessionData,
	input: { currentPassword: string; newPassword: string; totp?: string }
) {
	const patch: Record<string, unknown> = {
		currentSecret: input.currentPassword,
		secret: input.newPassword
	};
	if (input.totp?.trim()) patch['otpAuth/otpCode'] = input.totp.trim();
	const data = methodData(
		await request(account, [
			['x:AccountPassword/set', { update: { singleton: patch } }, 'password-set']
		]),
		'password-set'
	);
	assertSetSucceeded(data, 'updated');
}

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(buffer: Buffer): string {
	let bits = '';
	for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
	let result = '';
	for (let i = 0; i < bits.length; i += 5) {
		result += BASE32[Number.parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
	}
	return result;
}

export function beginTotpSetup(account: SessionData) {
	if (!account.id) throw new Error('Missing session');
	const secret = base32(randomBytes(20));
	const label = encodeURIComponent(account.username);
	const uri = `otpauth://totp/ZAUR:${label}?secret=${secret}&issuer=ZAUR&algorithm=SHA1&digits=6&period=30`;
	putTotpSetup(
		getStoreDb(),
		account.id,
		accountKey(account.username),
		sealSession({ secret, uri }),
		Date.now() + TOTP_SETUP_TTL_MS
	);
	return { secret, uri };
}

export async function confirmTotpSetup(
	account: SessionData,
	input: { currentPassword: string; code: string }
) {
	if (!account.id) throw new Error('Missing session');
	const sealed = consumeTotpSetup(getStoreDb(), account.id, accountKey(account.username));
	const setup = sealed ? (unsealSession(sealed) as { secret?: string; uri?: string } | null) : null;
	if (!setup?.uri) throw new Error('TOTP setup expired');
	const data = methodData(
		await request(account, [
			[
				'x:AccountPassword/set',
				{
					update: {
						singleton: {
							currentSecret: input.currentPassword,
							'otpAuth/otpUrl': setup.uri,
							'otpAuth/otpCode': input.code
						}
					}
				},
				'totp-set'
			]
		]),
		'totp-set'
	);
	assertSetSucceeded(data, 'updated');
}

export async function disableTotp(
	account: SessionData,
	input: { currentPassword: string; code: string }
) {
	const data = methodData(
		await request(account, [
			[
				'x:AccountPassword/set',
				{
					update: {
						singleton: {
							currentSecret: input.currentPassword,
							'otpAuth/otpUrl': null,
							'otpAuth/otpCode': input.code
						}
					}
				},
				'totp-disable'
			]
		]),
		'totp-disable'
	);
	assertSetSucceeded(data, 'updated');
}

export async function createCredential(
	account: SessionData,
	type: CredentialType,
	input: { description: string; expiresAt?: string | null; allowedIps?: string[] }
) {
	const allowedIps = Object.fromEntries((input.allowedIps ?? []).map((ip) => [ip, true]));
	const record: Record<string, unknown> = {
		description: input.description,
		permissions: credentialPermissions(type),
		allowedIps
	};
	if (input.expiresAt) record.expiresAt = input.expiresAt;
	const data = methodData(
		await request(account, [[`x:${type}/set`, { create: { credential: record } }, 'create']]),
		'create'
	);
	assertSetSucceeded(data, 'created');
	const credential = extractOneTimeCredential(data, 'credential');
	if (!credential) throw new Error('Stalwart did not return the credential secret');
	return credential;
}

export async function revokeCredential(
	account: SessionData,
	type: CredentialType,
	id: string
) {
	const data = methodData(
		await request(account, [[`x:${type}/set`, { destroy: [id] }, 'destroy']]),
		'destroy'
	);
	assertSetSucceeded(data, 'destroyed');
}
