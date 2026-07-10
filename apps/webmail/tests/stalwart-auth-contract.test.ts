import assert from 'node:assert/strict';
import test from 'node:test';
import {
	createStalwartAuthPayload,
	createTokenSession,
	parseStalwartAuthResponse
} from '../src/lib/server/stalwart-auth-contract.ts';

test('builds Stalwart authCode PKCE requests without inventing MFA state', () => {
	const payload = createStalwartAuthPayload({
		accountName: 'user@zaur.app',
		accountSecret: 'not-persisted',
		clientId: 'zaur-webmail-prod',
		redirectUri: 'https://webmail.zaur.app/api/auth/oauth/callback',
		scope: 'offline_access urn:ietf:params:jmap:mail',
		codeChallenge: 'challenge'
	});
	assert.deepEqual(payload, {
		type: 'authCode',
		accountName: 'user@zaur.app',
		accountSecret: 'not-persisted',
		mfaToken: null,
		clientId: 'zaur-webmail-prod',
		redirectUri: 'https://webmail.zaur.app/api/auth/oauth/callback',
		scope: 'offline_access urn:ietf:params:jmap:mail',
		codeChallenge: 'challenge',
		codeChallengeMethod: 'S256'
	});
});

test('includes inline TOTP only on the retry', () => {
	const payload = createStalwartAuthPayload({
		accountName: 'user@zaur.app',
		accountSecret: 'password',
		mfaToken: ' 123456 ',
		clientId: 'client',
		redirectUri: 'https://webmail.zaur.app/callback',
		scope: 'offline_access',
		codeChallenge: 'challenge'
	});
	assert.equal(payload.mfaToken, '123456');
});

test('parses documented password, MFA, failure, and malformed fixtures', () => {
	assert.deepEqual(parseStalwartAuthResponse({ type: 'authenticated', clientCode: 'ABC' }), {
		type: 'authenticated',
		clientCode: 'ABC'
	});
	assert.deepEqual(parseStalwartAuthResponse({ type: 'mfaRequired' }), { type: 'mfaRequired' });
	assert.deepEqual(parseStalwartAuthResponse({ type: 'failure' }), { type: 'failure' });
	assert.equal(parseStalwartAuthResponse({ type: 'authenticated' }), null);
	assert.equal(parseStalwartAuthResponse({ type: 'unknown' }), null);
});

test('creates token-only sessions without password or TOTP fields', () => {
	const session = createTokenSession({
		serverUrl: 'https://mail.zaur.app',
		username: 'user@zaur.app',
		accessToken: 'access',
		refreshToken: 'refresh',
		accessTokenExpiresAt: 1234
	});
	assert.equal(session.authMethod, 'oauth');
	assert.equal('password' in session, false);
	assert.equal('totp' in session, false);
});
