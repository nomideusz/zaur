import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { letterIndexAtY } from '../src/lib/components/contacts/letter-rail-hit.ts';

/** Three 28px buttons with 2px gaps, as the rail renders on a phone. */
const bounds = [
	{ top: 100, bottom: 128 },
	{ top: 130, bottom: 158 },
	{ top: 160, bottom: 188 }
];

describe('letterIndexAtY', () => {
	it('finds the letter under the finger', () => {
		assert.equal(letterIndexAtY(bounds, 100), 0);
		assert.equal(letterIndexAtY(bounds, 145), 1);
		assert.equal(letterIndexAtY(bounds, 188), 2);
	});

	it('sticks to the ends when the finger runs off the rail', () => {
		assert.equal(letterIndexAtY(bounds, -50), 0);
		assert.equal(letterIndexAtY(bounds, 9999), 2);
	});

	it('resolves gaps between buttons to the nearer one', () => {
		assert.equal(letterIndexAtY(bounds, 129), 0);
		assert.equal(letterIndexAtY(bounds, 159), 1);
	});

	it('reports nothing to hit when there are no letters', () => {
		assert.equal(letterIndexAtY([], 120), -1);
	});
});
