import { test } from 'node:test';
import assert from 'node:assert/strict';

import { browserRedirectUri, buildAuthorizationUrl, createPkceChallenge } from '../src/oauth-utils.ts';

test('the browser comes back to the host it left from', () => {
	assert.equal(
		browserRedirectUri('https://webmail.example.test/login?next=/'),
		'https://webmail.example.test/api/auth/oauth/callback'
	);
});

test('authorization URL carries the client, scopes, state and an S256 challenge', () => {
	const url = new URL(
		buildAuthorizationUrl({
			authorizationEndpoint: 'https://mail.example.test/login',
			clientId: 'mail-test',
			redirectUri: 'https://webmail.example.test/api/auth/oauth/callback',
			scopes: ['offline_access', 'urn:ietf:params:oauth:scope:mail'],
			state: 'state-123',
			codeVerifier: 'verifier-abc'
		})
	);
	assert.equal(url.origin + url.pathname, 'https://mail.example.test/login');
	const q = url.searchParams;
	assert.equal(q.get('response_type'), 'code');
	assert.equal(q.get('client_id'), 'mail-test');
	assert.equal(q.get('redirect_uri'), 'https://webmail.example.test/api/auth/oauth/callback');
	assert.equal(q.get('scope'), 'offline_access urn:ietf:params:oauth:scope:mail');
	assert.equal(q.get('state'), 'state-123');
	assert.equal(q.get('code_challenge_method'), 'S256');
	assert.equal(q.get('code_challenge'), createPkceChallenge('verifier-abc'));
});
