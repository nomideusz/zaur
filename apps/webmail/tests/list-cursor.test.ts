import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { moveCursor, rangeIds, resolveCursorId } from '../src/lib/mail/list-cursor.ts';

const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

describe('moveCursor', () => {
	it('returns null for an empty list', () => {
		assert.equal(moveCursor([], null, 1), null);
		assert.equal(moveCursor([], 'a', 1), null);
	});

	it('seeds from the start when moving forward without a cursor', () => {
		assert.equal(moveCursor(list, null, 1), 'a');
		assert.equal(moveCursor(list, null, 0), 'a');
	});

	it('seeds from the end when moving backward without a cursor', () => {
		assert.equal(moveCursor(list, null, -1), 'd');
	});

	it('moves within bounds and clamps at the ends', () => {
		assert.equal(moveCursor(list, 'a', 1), 'b');
		assert.equal(moveCursor(list, 'b', -1), 'a');
		assert.equal(moveCursor(list, 'a', -1), 'a');
		assert.equal(moveCursor(list, 'd', 1), 'd');
		assert.equal(moveCursor(list, 'a', 3), 'd');
	});

	it('re-seeds when the current id is missing from the list', () => {
		assert.equal(moveCursor(list, 'missing', 1), 'a');
		assert.equal(moveCursor(list, 'missing', -1), 'd');
	});
});

describe('rangeIds', () => {
	it('returns inclusive ids between anchor and target', () => {
		assert.deepEqual(rangeIds(list, 'b', 'd'), ['b', 'c', 'd']);
		assert.deepEqual(rangeIds(list, 'd', 'b'), ['b', 'c', 'd']);
		assert.deepEqual(rangeIds(list, 'a', 'a'), ['a']);
	});

	it('handles missing ends', () => {
		assert.deepEqual(rangeIds(list, 'missing', 'c'), ['c']);
		assert.deepEqual(rangeIds(list, 'b', 'missing'), ['b']);
		assert.deepEqual(rangeIds(list, 'x', 'y'), []);
	});
});

describe('resolveCursorId', () => {
	it('returns null for an empty list', () => {
		assert.equal(resolveCursorId([], 'a'), null);
	});

	it('prefers preferredId when present', () => {
		assert.equal(resolveCursorId(list, 'a', 'c'), 'c');
	});

	it('keeps currentId when preferred is absent', () => {
		assert.equal(resolveCursorId(list, 'b', 'missing'), 'b');
	});

	it('falls back to the first item', () => {
		assert.equal(resolveCursorId(list, 'missing', 'also-missing'), 'a');
		assert.equal(resolveCursorId(list, null, null), 'a');
	});
});
