import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSessionRejected } from '../src/lib/server/jmap.ts';
import { sameCredentials } from '../src/lib/server/push-watcher.ts';
import type { SessionData } from '@zaur/server-auth';

test('credentials the server refused end the session', () => {
	assert.equal(isSessionRejected(new Error('Unauthorized')), true);
	assert.equal(isSessionRejected(new Error('Invalid username or password')), true);
});

test('an outage never signs anyone out', () => {
	for (const message of [
		'fetch failed',
		'Failed to get session: 502',
		'Failed to get session: 503',
		'Failed to get session: 403',
		'getaddrinfo ENOTFOUND mail'
	]) {
		assert.equal(isSessionRejected(new Error(message)), false, message);
	}
	assert.equal(isSessionRejected('Unauthorized'), false);
	assert.equal(isSessionRejected(null), false);
});

test('a watcher sees a new sign-in by its tokens, and nothing else', () => {
	const account = { username: 'a@example.org', accessToken: 'old', refreshToken: 'old' } as SessionData;
	assert.equal(sameCredentials(account, { ...account, displayName: 'A' }), true);
	assert.equal(sameCredentials(account, { ...account, accessToken: 'new' }), false);
	assert.equal(sameCredentials(account, { ...account, refreshToken: 'new' }), false);
});
