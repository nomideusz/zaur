import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, webcrypto } from 'node:crypto';
import { computePkceChallenge, type PkceCrypto } from '../src/auth/pkce.ts';

const nodeCrypto: PkceCrypto = {
	randomBytes: (length) => new Uint8Array(randomBytes(length)),
	sha256: async (data) => new Uint8Array(await webcrypto.subtle.digest('SHA-256', data))
};

test('S256 code challenge matches the RFC 7636 appendix B vector', async () => {
	assert.equal(
		await computePkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk', nodeCrypto),
		'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
	);
});
