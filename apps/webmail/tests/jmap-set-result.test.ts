import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setFailureMessage } from '../src/lib/server/jmap-set-result.ts';

describe('setFailureMessage', () => {
	it('returns the description, falls back to the type, null on success', () => {
		assert.equal(
			setFailureMessage({ notUpdated: { singleton: { type: 'invalidProperties', description: 'Password is too weak.' } } }),
			'Password is too weak.'
		);
		assert.equal(setFailureMessage({ notUpdated: { singleton: { type: 'forbidden' } } }), 'forbidden');
		assert.equal(setFailureMessage({ updated: ['singleton'] }), null);
		assert.equal(setFailureMessage({ notCreated: { a: null } }), null);
	});
});
