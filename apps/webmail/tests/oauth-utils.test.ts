import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	createPkceChallenge,
	sanitizeLocalRedirect
} from '../src/lib/server/oauth-utils.ts';

describe('OAuth utilities', () => {
	it('creates the RFC 7636 S256 challenge', () => {
		assert.equal(
			createPkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
			'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
		);
	});

	it('keeps local paths with query and fragment', () => {
		assert.equal(sanitizeLocalRedirect('/mail/inbox?q=hello#thread'), '/mail/inbox?q=hello#thread');
	});

	it('rejects external and malformed redirects', () => {
		assert.equal(sanitizeLocalRedirect('https://example.com'), undefined);
		assert.equal(sanitizeLocalRedirect('//example.com/path'), undefined);
		assert.equal(sanitizeLocalRedirect('/\\example.com/path'), undefined);
		assert.equal(sanitizeLocalRedirect(null), undefined);
	});
});
