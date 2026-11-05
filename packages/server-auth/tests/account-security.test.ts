import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	AccountSecurityError,
	MANAGEMENT_USING,
	changeAccountPassword,
	createCredential,
	credentialPermissions,
	disableTotp,
	enableTotp,
	extractOneTimeCredential,
	getAccountSecurityOverview,
	listCredentials,
	revokeCredential,
	setFailureMessage,
	type ManagementClient
} from '../src/account-security.ts';
import type { JMAPMethodCall, JMAPResponse } from '@zaur/mail-core';

/** A JMAP client that answers from a script and records what it was asked. */
function fakeClient(
	answer: (call: JMAPMethodCall) => [string, Record<string, unknown>]
): ManagementClient & { calls: JMAPMethodCall[]; using: string[][] } {
	const calls: JMAPMethodCall[] = [];
	const using: string[][] = [];
	return {
		calls,
		using,
		async request(methodCalls, usingArg): Promise<JMAPResponse> {
			calls.push(...methodCalls);
			using.push(usingArg ?? []);
			return {
				methodResponses: methodCalls.map((call) => {
					const [name, data] = answer(call);
					return [name, data, call[2]];
				})
			};
		}
	};
}

test('every call goes out under the Stalwart management capability', async () => {
	const client = fakeClient(([name]) =>
		name === 'x:AccountPassword/get'
			? [name, { list: [{ id: 'singleton', otpAuth: { otpUrl: null } }] }]
			: name.endsWith('/query')
				? [name, { ids: [] }]
				: [name, { list: [] }]
	);
	await getAccountSecurityOverview(client);
	assert.ok(client.using.length > 0);
	for (const used of client.using) assert.deepEqual(used, MANAGEMENT_USING);
});

test('overview reads TOTP from the masked otpUrl and lists both credential kinds', async () => {
	const client = fakeClient(([name, args]) => {
		if (name === 'x:AccountPassword/get')
			return [name, { list: [{ id: 'singleton', otpAuth: { otpUrl: '********' } }] }];
		if (name.endsWith('/query')) return [name, { ids: ['a'] }];
		if (name === 'x:AppPassword/get')
			return [
				name,
				{
					list: [
						{
							id: 'a',
							description: 'Thunderbird',
							createdAt: '2026-09-01T00:00:00Z',
							allowedIps: { '10.0.0.0/8': true }
						}
					]
				}
			];
		if (name === 'x:ApiKey/get')
			return [name, { list: [{ id: 'a', description: 'CI', expiresAt: '2027-01-01T00:00:00Z' }] }];
		throw new Error(`unexpected ${name} ${JSON.stringify(args)}`);
	});
	const overview = await getAccountSecurityOverview(client);
	assert.equal(overview.totpEnabled, true);
	assert.deepEqual(overview.appPasswords, [
		{
			id: 'a',
			description: 'Thunderbird',
			createdAt: '2026-09-01T00:00:00Z',
			expiresAt: null,
			allowedIps: ['10.0.0.0/8']
		}
	]);
	assert.equal(overview.apiKeys[0]?.expiresAt, '2027-01-01T00:00:00Z');
});

test('listCredentials chains query into get with a back-reference', async () => {
	const client = fakeClient(([name]) =>
		name.endsWith('/query') ? [name, { ids: [] }] : [name, { list: [] }]
	);
	await listCredentials(client, 'ApiKey');
	const [query, get] = client.calls;
	assert.equal(query?.[0], 'x:ApiKey/query');
	assert.equal(get?.[0], 'x:ApiKey/get');
	assert.deepEqual(get?.[1]['#ids'], { resultOf: 'query', name: 'x:ApiKey/query', path: '/ids' });
});

test('password change sends currentSecret and the new secret, plus the code only when given', async () => {
	const client = fakeClient(([name]) => [name, { updated: { singleton: null } }]);
	await changeAccountPassword(client, { currentPassword: 'old', newPassword: 'new' });
	assert.deepEqual(client.calls[0]?.[1], {
		update: { singleton: { currentSecret: 'old', secret: 'new' } }
	});
	await changeAccountPassword(client, { currentPassword: 'old', newPassword: 'new', totp: ' 12 3456 ' });
	assert.equal((client.calls[1]?.[1].update as any).singleton['otpAuth/otpCode'], '123456');
});

test('enable and disable TOTP patch otpAuth/otpUrl in the same call as the password', async () => {
	const client = fakeClient(([name]) => [name, { updated: { singleton: null } }]);
	await enableTotp(client, { currentPassword: 'pw', otpUrl: 'otpauth://totp/x', code: '111111' });
	assert.deepEqual(client.calls[0]?.[1], {
		update: {
			singleton: { currentSecret: 'pw', 'otpAuth/otpCode': '111111', 'otpAuth/otpUrl': 'otpauth://totp/x' }
		}
	});
	await disableTotp(client, { currentPassword: 'pw', code: '222222' });
	assert.equal((client.calls[1]?.[1].update as any).singleton['otpAuth/otpUrl'], null);
});

test("Stalwart's own rejection reason surfaces as an AccountSecurityError", async () => {
	const client = fakeClient(([name]) => [
		name,
		{ notUpdated: { singleton: { type: 'invalidProperties', description: 'Password is too weak' } } }
	]);
	await assert.rejects(
		changeAccountPassword(client, { currentPassword: 'a', newPassword: 'b' }),
		(error: unknown) =>
			error instanceof AccountSecurityError && error.userMessage === 'Password is too weak'
	);
});

test('a method-level error with a description is shown too, a bare one is not', async () => {
	const described = fakeClient(() => ['error', { type: 'forbidden', description: 'nope' }]);
	await assert.rejects(revokeCredential(described, 'ApiKey', 'k'), AccountSecurityError);
	const bare = fakeClient(() => ['error', { type: 'serverFail' }]);
	await assert.rejects(revokeCredential(bare, 'ApiKey', 'k'), (error: unknown) => {
		return error instanceof Error && !(error instanceof AccountSecurityError);
	});
});

test('createCredential returns the one-time secret and applies the permission preset', async () => {
	const client = fakeClient(([name]) => [
		name,
		{ created: { credential: { id: 'c1', secret: 'app_secret' } } }
	]);
	const credential = await createCredential(client, 'AppPassword', { description: 'Phone' });
	assert.deepEqual(credential, { id: 'c1', secret: 'app_secret' });
	const record = (client.calls[0]?.[1].create as any).credential;
	assert.deepEqual(record.permissions, { '@type': 'Inherit' });
	assert.deepEqual(record.allowedIps, {});
	assert.equal('expiresAt' in record, false);
});

test('API keys cannot manage credentials; app passwords inherit', () => {
	assert.deepEqual(credentialPermissions('AppPassword'), { '@type': 'Inherit' });
	const apiKey = credentialPermissions('ApiKey');
	assert.equal(apiKey['@type'], 'Disable');
	assert.equal((apiKey as any).permissions.sysApiKeyCreate, true);
	assert.equal((apiKey as any).permissions.sysAccountPasswordUpdate, true);
});

const FORBIDDEN = {
	notCreated: {
		credential: { type: 'forbidden', description: 'You are not authorized to grant permissions: interactAi' }
	}
};

test('a scoped sign-in names what it holds, without managing credentials', async () => {
	const client = fakeClient(([name, args]) => {
		const record = (args.create as any).credential;
		return record.permissions['@type'] === 'Replace'
			? [name, { created: { credential: { id: 'c1', secret: 'app_secret' } } }]
			: [name, FORBIDDEN];
	});
	client.fetchAccountPermissions = async () => [
		'authenticate',
		'emailSend',
		'imapFetch',
		'sysSpamTrainingSampleGet',
		'sysAccountPasswordUpdate',
		'sysAppPasswordCreate',
		'sysApiKeyDestroy',
		'sysOAuthGrantGet'
	];
	for (const kind of ['AppPassword', 'ApiKey'] as const) {
		client.calls.length = 0;
		const credential = await createCredential(client, kind, { description: 'Phone' });
		assert.deepEqual(credential, { id: 'c1', secret: 'app_secret' });
		assert.equal(client.calls.length, 2);
		assert.deepEqual((client.calls[1]?.[1].create as any).credential.permissions, {
			'@type': 'Replace',
			permissions: {
				authenticate: true,
				emailSend: true,
				imapFetch: true,
				sysSpamTrainingSampleGet: true
			}
		});
	}
});

test('a server that cannot say what the sign-in holds keeps its refusal', async () => {
	const without = fakeClient(([name]) => [name, FORBIDDEN]);
	const silent = fakeClient(([name]) => [name, FORBIDDEN]);
	silent.fetchAccountPermissions = async () => null;
	for (const client of [without, silent]) {
		await assert.rejects(
			createCredential(client, 'AppPassword', { description: 'Phone' }),
			/not authorized to grant/
		);
		assert.equal(client.calls.length, 1);
	}
});

test('other refusals are not retried, and a second refusal is reported', async () => {
	const invalid = fakeClient(([name]) => [
		name,
		{ notCreated: { credential: { type: 'invalidProperties', description: 'Bad name' } } }
	]);
	let asked = false;
	invalid.fetchAccountPermissions = async () => {
		asked = true;
		return ['authenticate'];
	};
	await assert.rejects(createCredential(invalid, 'AppPassword', { description: 'x' }), /Bad name/);
	assert.equal(asked, false);

	const refused = fakeClient(([name]) => [name, FORBIDDEN]);
	refused.fetchAccountPermissions = async () => ['authenticate'];
	await assert.rejects(
		createCredential(refused, 'AppPassword', { description: 'x' }),
		/not authorized to grant/
	);
	assert.equal(refused.calls.length, 2);
});

test('one-time secrets are read from the creation response only', () => {
	assert.deepEqual(
		extractOneTimeCredential({ created: { c: { id: 'id-1', secret: 'shown-once' } } }, 'c'),
		{ id: 'id-1', secret: 'shown-once' }
	);
	assert.equal(extractOneTimeCredential({ created: { c: { id: 'id-1' } } }, 'c'), null);
	assert.equal(extractOneTimeCredential({ list: [{ id: 'x', secret: 'must-not-leak' }] }, 'c'), null);
});

test('setFailureMessage prefers the description and falls back to the type', () => {
	assert.equal(setFailureMessage({ notCreated: { c: { type: 'overQuota' } } }), 'overQuota');
	assert.equal(
		setFailureMessage({ notDestroyed: { c: { type: 'notFound', description: 'Gone' } } }),
		'Gone'
	);
	assert.equal(setFailureMessage({ updated: { singleton: null } }), null);
});
