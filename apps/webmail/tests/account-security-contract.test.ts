import assert from 'node:assert/strict';
import test from 'node:test';
import {
	credentialPermissions,
	extractOneTimeCredential
} from '../src/lib/server/account-security-contract.ts';

test('app passwords inherit mail access while API keys cannot mutate credentials', () => {
	assert.deepEqual(credentialPermissions('AppPassword'), { '@type': 'Inherit' });
	const apiPermissions = credentialPermissions('ApiKey');
	assert.equal(apiPermissions['@type'], 'Disable');
	assert.ok(apiPermissions.permissions.includes('sysAccountPasswordUpdate'));
	assert.ok(apiPermissions.permissions.includes('sysApiKeyCreate'));
});

test('one-time secrets are accepted only from the creation response', () => {
	assert.deepEqual(
		extractOneTimeCredential(
			{ created: { credential: { id: 'id-1', secret: 'shown-once' } } },
			'credential'
		),
		{ id: 'id-1', secret: 'shown-once' }
	);
	assert.equal(
		extractOneTimeCredential({ created: { credential: { id: 'id-1' } } }, 'credential'),
		null
	);
	assert.equal(extractOneTimeCredential({ list: [{ secret: 'must-not-leak' }] }, 'credential'), null);
});
