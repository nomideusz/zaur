import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPkceChallenge } from '../src/lib/server/oauth-utils.ts';

describe('OAuth utilities', () => {
	it('creates the RFC 7636 S256 challenge', () => {
		assert.equal(
			createPkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
			'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
		);
	});
});
