import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { invalidAddressParts, parseAddressList } from '../src/lib/utils/addresses.ts';

describe('address parsing', () => {
	it('keeps quoted display names with commas together', () => {
		assert.deepEqual(parseAddressList('"Doe, Jane" <jane@example.com>, john@example.com'), [
			'jane@example.com',
			'john@example.com'
		]);
	});

	it('splits on semicolons outside of angle brackets', () => {
		assert.deepEqual(parseAddressList('one@example.com; Two <two@example.com>'), [
			'one@example.com',
			'two@example.com'
		]);
	});

	it('reports malformed recipients instead of silently dropping them', () => {
		assert.deepEqual(invalidAddressParts('good@example.com, not-an-address, bad@'), [
			'not-an-address',
			'bad@'
		]);
	});
});
