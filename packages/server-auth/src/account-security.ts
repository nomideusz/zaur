/**
 * Account self-service on Stalwart: password, TOTP, app passwords, API keys.
 *
 * Stalwart 0.16 replaced its REST management API with JMAP. Everything here is
 * a `Foo/set` or `Foo/get` under the `urn:stalwart:jmap` capability, on
 * `x:`-prefixed object types:
 *
 * - `x:AccountPassword` is a singleton. Changing the password or the TOTP
 *   state needs the current password (`currentSecret`) in the same call, and
 *   the current code (`otpAuth/otpCode`) once TOTP is on. That is the step-up;
 *   there is no separate "verify" endpoint on the server.
 * - `x:AppPassword` and `x:ApiKey` are ordinary collections. The plaintext
 *   secret is returned once, in the `created` map of the `set` response, and
 *   never again — `extractOneTimeCredential` refuses to read it from anywhere
 *   else so a listing can never leak one.
 *
 * Framework-agnostic: the caller hands in a connected JMAP client. Shared by
 * Mail 2.0 (remote functions) and whatever comes after.
 */
import type { JMAPMethodCall, JMAPResponse } from '@zaur/mail-core';
import { log } from './log.ts';

export const MANAGEMENT_USING = ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'];

export type CredentialType = 'AppPassword' | 'ApiKey';

/** The only thing this module needs from a JMAP client. */
export interface ManagementClient {
	request(methodCalls: JMAPMethodCall[], using?: string[]): Promise<JMAPResponse>;
}

export interface CredentialSummary {
	id: string;
	description: string;
	createdAt: string | null;
	expiresAt: string | null;
	allowedIps: string[];
}

export interface AccountSecurityOverview {
	totpEnabled: boolean;
	appPasswords: CredentialSummary[];
	apiKeys: CredentialSummary[];
}

/** Thrown when Stalwart gave a reason the person can act on. */
export class AccountSecurityError extends Error {
	readonly userMessage: string;
	constructor(userMessage: string) {
		super(userMessage);
		this.name = 'AccountSecurityError';
		this.userMessage = userMessage;
	}
}

/**
 * Pull the human-readable reason out of a JMAP Foo/set failure (notUpdated /
 * notCreated / notDestroyed). Stalwart's descriptions here are written for the
 * person ("Password is too weak…", wrong current password), so they are worth
 * showing instead of a bare "failed".
 */
export function setFailureMessage(data: Record<string, unknown>): string | null {
	for (const key of ['notUpdated', 'notCreated', 'notDestroyed']) {
		const failures = data[key];
		if (!failures || typeof failures !== 'object') continue;
		for (const entry of Object.values(failures as Record<string, unknown>)) {
			if (!entry || typeof entry !== 'object') continue;
			const { description, type } = entry as { description?: unknown; type?: unknown };
			if (typeof description === 'string' && description.trim()) return description.trim();
			if (typeof type === 'string' && type.trim()) return type.trim();
		}
	}
	return null;
}

const API_KEY_DISABLED_PERMISSIONS = [
	'sysAccountPasswordUpdate',
	'sysAppPasswordCreate',
	'sysAppPasswordUpdate',
	'sysAppPasswordDestroy',
	'sysApiKeyCreate',
	'sysApiKeyUpdate',
	'sysApiKeyDestroy'
] as const;

/**
 * App passwords stand in for the account in mail clients, so they inherit.
 * API keys are for automation, so they may not mint or revoke credentials —
 * a leaked key must not be able to make itself permanent.
 */
export function credentialPermissions(type: CredentialType) {
	return type === 'ApiKey'
		? { '@type': 'Disable' as const, permissions: [...API_KEY_DISABLED_PERMISSIONS] }
		: { '@type': 'Inherit' as const };
}

/** Only the `created` map of a `set` response may carry a secret. */
export function extractOneTimeCredential(
	data: Record<string, unknown>,
	creationId: string
): { id: string; secret: string } | null {
	if (!data.created || typeof data.created !== 'object') return null;
	const created = (data.created as Record<string, unknown>)[creationId];
	if (!created || typeof created !== 'object') return null;
	const record = created as Record<string, unknown>;
	return typeof record.id === 'string' && typeof record.secret === 'string'
		? { id: record.id, secret: record.secret }
		: null;
}

function methodData(response: JMAPResponse, callId: string): Record<string, unknown> {
	const call = response.methodResponses.find((item) => item[2] === callId);
	if (!call) {
		log.warn('stalwart_account_security_missing_response', { callId });
		throw new Error('Stalwart account-security request failed');
	}
	if (call[0] === 'error') {
		const type = typeof call[1]?.type === 'string' ? call[1].type : null;
		const description = typeof call[1]?.description === 'string' ? call[1].description : null;
		log.warn('stalwart_account_security_method_error', { callId, errorType: type });
		if (type === 'forbidden' || type === 'unknownMethod') {
			throw new AccountSecurityError('This server does not allow that change from here');
		}
		if (description) throw new AccountSecurityError(description);
		throw new Error('Stalwart account-security request failed');
	}
	return call[1];
}

async function request(client: ManagementClient, methodCalls: JMAPMethodCall[]) {
	const body = await client.request(methodCalls, MANAGEMENT_USING);
	if (!Array.isArray(body?.methodResponses)) {
		log.warn('stalwart_account_security_contract_mismatch', {});
		throw new Error('Invalid Stalwart account-security response');
	}
	return body;
}

function assertSetSucceeded(
	data: Record<string, unknown>,
	operation: 'updated' | 'created' | 'destroyed'
): void {
	// JMAP: `updated` is an Id→(Foo|null) map, never an array.
	const updated = data.updated;
	if (operation === 'updated' && updated && typeof updated === 'object' && 'singleton' in updated)
		return;
	if (operation === 'destroyed' && Array.isArray(data.destroyed) && data.destroyed.length) return;
	if (operation === 'created' && data.created && typeof data.created === 'object') return;
	const reason = setFailureMessage(data);
	log.warn('stalwart_account_security_rejected', { operation, reason });
	if (reason) throw new AccountSecurityError(reason);
	throw new Error('Stalwart rejected the account-security change');
}

function toSummary(record: Record<string, unknown>): CredentialSummary | null {
	if (typeof record.id !== 'string') return null;
	const allowedIps = record.allowedIps;
	return {
		id: record.id,
		description: typeof record.description === 'string' ? record.description : '',
		createdAt: typeof record.createdAt === 'string' ? record.createdAt : null,
		expiresAt: typeof record.expiresAt === 'string' ? record.expiresAt : null,
		// Stalwart stores allowedIps as a set (a map of mask → true); accept a
		// plain list too so a shape change upstream degrades to "no masks shown".
		allowedIps: Array.isArray(allowedIps)
			? allowedIps.filter((ip): ip is string => typeof ip === 'string')
			: allowedIps && typeof allowedIps === 'object'
				? Object.keys(allowedIps as Record<string, unknown>)
				: []
	};
}

export async function listCredentials(
	client: ManagementClient,
	type: CredentialType
): Promise<CredentialSummary[]> {
	const response = await request(client, [
		[`x:${type}/query`, { filter: {} }, 'query'],
		[
			`x:${type}/get`,
			{
				'#ids': { resultOf: 'query', name: `x:${type}/query`, path: '/ids' },
				properties: ['id', 'description', 'createdAt', 'expiresAt', 'allowedIps']
			},
			'get'
		]
	]);
	methodData(response, 'query');
	const get = methodData(response, 'get');
	const list = Array.isArray(get.list) ? (get.list as Record<string, unknown>[]) : [];
	return list.map(toSummary).filter((item): item is CredentialSummary => item !== null);
}

export async function isTotpEnabled(client: ManagementClient): Promise<boolean> {
	const data = methodData(
		await request(client, [
			['x:AccountPassword/get', { ids: ['singleton'], properties: ['id', 'otpAuth'] }, 'password']
		]),
		'password'
	);
	const record = Array.isArray(data.list)
		? (data.list[0] as { otpAuth?: { otpUrl?: string | null } } | undefined)
		: undefined;
	return Boolean(record?.otpAuth?.otpUrl);
}

export async function getAccountSecurityOverview(
	client: ManagementClient
): Promise<AccountSecurityOverview> {
	const [totpEnabled, appPasswords, apiKeys] = await Promise.all([
		isTotpEnabled(client),
		listCredentials(client, 'AppPassword'),
		listCredentials(client, 'ApiKey')
	]);
	return { totpEnabled, appPasswords, apiKeys };
}

function passwordPatch(currentPassword: string, totp?: string) {
	const patch: Record<string, unknown> = { currentSecret: currentPassword };
	const code = totp?.replace(/\s+/g, '');
	if (code) patch['otpAuth/otpCode'] = code;
	return patch;
}

/**
 * Change the password. On Stalwart this bumps the credential version, which
 * revokes every OAuth token the account holds — the caller has to sign the
 * session in again with the new password afterwards.
 */
export async function changeAccountPassword(
	client: ManagementClient,
	input: { currentPassword: string; newPassword: string; totp?: string }
): Promise<void> {
	const patch = passwordPatch(input.currentPassword, input.totp);
	patch.secret = input.newPassword;
	const data = methodData(
		await request(client, [
			['x:AccountPassword/set', { update: { singleton: patch } }, 'password-set']
		]),
		'password-set'
	);
	assertSetSucceeded(data, 'updated');
}

/** Turn TOTP on with a secret the client minted (see `totp.ts`). */
export async function enableTotp(
	client: ManagementClient,
	input: { currentPassword: string; otpUrl: string; code: string }
): Promise<void> {
	const patch = passwordPatch(input.currentPassword, input.code);
	patch['otpAuth/otpUrl'] = input.otpUrl;
	const data = methodData(
		await request(client, [['x:AccountPassword/set', { update: { singleton: patch } }, 'totp-set']]),
		'totp-set'
	);
	assertSetSucceeded(data, 'updated');
}

export async function disableTotp(
	client: ManagementClient,
	input: { currentPassword: string; code: string }
): Promise<void> {
	const patch = passwordPatch(input.currentPassword, input.code);
	patch['otpAuth/otpUrl'] = null;
	const data = methodData(
		await request(client, [
			['x:AccountPassword/set', { update: { singleton: patch } }, 'totp-disable']
		]),
		'totp-disable'
	);
	assertSetSucceeded(data, 'updated');
}

export async function createCredential(
	client: ManagementClient,
	type: CredentialType,
	input: { description: string; expiresAt?: string | null; allowedIps?: string[] }
): Promise<{ id: string; secret: string }> {
	const record: Record<string, unknown> = {
		description: input.description,
		permissions: credentialPermissions(type),
		allowedIps: Object.fromEntries((input.allowedIps ?? []).map((ip) => [ip, true]))
	};
	if (input.expiresAt) record.expiresAt = input.expiresAt;
	const data = methodData(
		await request(client, [[`x:${type}/set`, { create: { credential: record } }, 'create']]),
		'create'
	);
	assertSetSucceeded(data, 'created');
	const credential = extractOneTimeCredential(data, 'credential');
	if (!credential) throw new Error('Stalwart did not return the credential secret');
	return credential;
}

export async function revokeCredential(
	client: ManagementClient,
	type: CredentialType,
	id: string
): Promise<void> {
	const data = methodData(
		await request(client, [[`x:${type}/set`, { destroy: [id] }, 'destroy']]),
		'destroy'
	);
	assertSetSucceeded(data, 'destroyed');
}
