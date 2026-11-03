import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStalwartAuthPayload, parseStalwartAuthResponse } from '../src/auth/contract.ts';

const INPUT = {
	accountName: 'a@example.org',
	accountSecret: 'secret',
	mfaToken: ' 123456 ',
	clientId: 'zaur-mail2-prod',
	redirectUri: 'https://mail.example.org/api/auth/oauth/callback',
	scope: 'offline_access urn:ietf:params:oauth:scope:mail',
	codeChallenge: 'challenge'
};

test('the payload carries the fields Stalwart 0.16 reads', () => {
	const payload = createStalwartAuthPayload(INPUT);
	assert.equal(payload.type, 'authCode');
	assert.equal(payload.mfaToken, '123456');
	assert.equal(payload.clientId, INPUT.clientId);
	assert.equal(payload.redirectUri, INPUT.redirectUri);
	assert.equal(payload.scope, INPUT.scope);
	assert.equal(payload.codeChallenge, INPUT.codeChallenge);
	assert.equal(payload.codeChallengeMethod, 'S256');
});

test('the payload carries the authorization query Stalwart 1.0 reads', () => {
	const payload = createStalwartAuthPayload(INPUT);
	assert.equal(payload.consent, true);
	assert.deepEqual(Object.fromEntries(new URLSearchParams(payload.query)), {
		response_type: 'code',
		client_id: INPUT.clientId,
		redirect_uri: INPUT.redirectUri,
		scope: INPUT.scope,
		state: INPUT.codeChallenge,
		code_challenge: INPUT.codeChallenge,
		code_challenge_method: 'S256'
	});
});

test('a 0.16 response gives its client code, in either spelling', () => {
	const expected = { type: 'authenticated', clientCode: 'abc' };
	assert.deepEqual(
		parseStalwartAuthResponse({ type: 'authenticated', clientCode: 'abc', iss: 'x' }),
		expected
	);
	assert.deepEqual(parseStalwartAuthResponse({ type: 'authenticated', client_code: 'abc' }), expected);
});

test('a 1.0 response gives the code from its redirect', () => {
	assert.deepEqual(
		parseStalwartAuthResponse({
			type: 'authenticated',
			location: 'https://mail.example.org/cb?code=abc&state=s&iss=https%3A%2F%2Fm'
		}),
		{ type: 'authenticated', clientCode: 'abc' }
	);
});

test('a redirect without a code is not a sign-in', () => {
	for (const location of ['https://mail.example.org/cb?error=access_denied', 'not a url', 42]) {
		assert.equal(parseStalwartAuthResponse({ type: 'authenticated', location }), null);
	}
});

test('outcomes this flow cannot act on are a contract mismatch', () => {
	for (const type of ['consentRequired', 'redirect', 'invalid', 'denied', 'expired']) {
		assert.equal(parseStalwartAuthResponse({ type, location: 'https://x/?error=e' }), null);
	}
});

test('a second factor and a wrong password still read as before', () => {
	assert.deepEqual(parseStalwartAuthResponse({ type: 'mfaRequired' }), { type: 'mfaRequired' });
	assert.deepEqual(parseStalwartAuthResponse({ type: 'failure' }), { type: 'failure' });
});
