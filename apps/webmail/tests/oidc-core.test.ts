import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createVerify } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import {
	consumeAuthCode,
	createAuthCode,
	discoveryDocument,
	getOrCreateKeypair,
	publicJwks,
	secretsEqual,
	signIdToken,
	verifyPkceS256,
	type AuthCodeData
} from '../src/lib/server/oidc/core.ts';

const CLAIMS = { sub: '125', preferred_username: 'user@zaur.app', email: 'user@zaur.app' };
const CODE_DATA: AuthCodeData = {
	clientId: 'ytzero',
	redirectUri: 'https://bartube.zaur.app/api/auth/oidc/callback',
	codeChallenge: createHash('sha256').update('verifier-value').digest('base64url'),
	nonce: 'n-1',
	claims: CLAIMS
};

describe('oidc core', () => {
	it('persists one keypair and reuses it', () => {
		const db = new DatabaseSync(':memory:');
		const first = getOrCreateKeypair(db);
		const second = getOrCreateKeypair(db);
		assert.equal(first.kid, second.kid);
		assert.equal(first.privatePem, second.privatePem);
		const jwks = publicJwks(first);
		assert.equal(jwks.keys.length, 1);
		assert.equal(jwks.keys[0].kid, first.kid);
		assert.equal(jwks.keys[0].kty, 'RSA');
	});

	it('signs id_tokens that verify against the public key', () => {
		const db = new DatabaseSync(':memory:');
		const keypair = getOrCreateKeypair(db);
		const token = signIdToken(keypair, { iss: 'https://webmail.zaur.app', ...CLAIMS });
		const [header, payload, signature] = token.split('.');
		assert.equal(JSON.parse(Buffer.from(header, 'base64url').toString()).alg, 'RS256');
		assert.equal(JSON.parse(Buffer.from(payload, 'base64url').toString()).preferred_username, CLAIMS.preferred_username);
		const verified = createVerify('RSA-SHA256')
			.update(`${header}.${payload}`)
			.verify(keypair.publicPem, Buffer.from(signature, 'base64url'));
		assert.equal(verified, true);
	});

	it('auth codes are one-time and expire', () => {
		const db = new DatabaseSync(':memory:');
		const code = createAuthCode(db, CODE_DATA, 60_000, 1_000);
		assert.deepEqual(consumeAuthCode(db, code, 2_000), CODE_DATA);
		assert.equal(consumeAuthCode(db, code, 2_000), null);

		const expired = createAuthCode(db, CODE_DATA, 60_000, 1_000);
		assert.equal(consumeAuthCode(db, expired, 62_000), null);
		assert.equal(consumeAuthCode(db, 'no-such-code', 2_000), null);
	});

	it('verifies PKCE S256 and rejects mismatches', () => {
		assert.equal(verifyPkceS256('verifier-value', CODE_DATA.codeChallenge), true);
		assert.equal(verifyPkceS256('wrong-verifier', CODE_DATA.codeChallenge), false);
		assert.equal(verifyPkceS256('', CODE_DATA.codeChallenge), false);
	});

	it('compares client secrets without throwing on length mismatch', () => {
		assert.equal(secretsEqual('secret', 'secret'), true);
		assert.equal(secretsEqual('secret', 'secreT'), false);
		assert.equal(secretsEqual('secret', 'longer-secret'), false);
	});

	it('discovery document points at the issuer origin', () => {
		const doc = discoveryDocument('https://webmail.zaur.app');
		assert.equal(doc.issuer, 'https://webmail.zaur.app');
		assert.equal(doc.authorization_endpoint, 'https://webmail.zaur.app/oidc/authorize');
		assert.equal(doc.jwks_uri, 'https://webmail.zaur.app/oidc/jwks');
	});
});
