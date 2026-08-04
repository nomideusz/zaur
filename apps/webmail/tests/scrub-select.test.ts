import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextScrubSelection, scrubRangeIds } from '../src/lib/mail/scrub-select.ts';

const ORDER = ['a', 'b', 'c', 'd'];

describe('scrub-select', () => {
	it('adds the hit id without removing others', () => {
		const next = nextScrubSelection(ORDER, new Set(['a']), 'c', 'add');
		assert.deepEqual([...next].sort(), ['a', 'c']);
	});

	it('ignores ids outside the visible list', () => {
		const next = nextScrubSelection(ORDER, new Set(['a']), 'z', 'add');
		assert.deepEqual([...next], ['a']);
	});

	it('toggles membership when asked', () => {
		const added = nextScrubSelection(ORDER, new Set(['a']), 'b', 'toggle');
		assert.ok(added.has('b'));
		const removed = nextScrubSelection(ORDER, added, 'a', 'toggle');
		assert.equal(removed.has('a'), false);
		assert.ok(removed.has('b'));
	});

	it('builds an inclusive range between anchors', () => {
		assert.deepEqual(scrubRangeIds(ORDER, 'b', 'd'), ['b', 'c', 'd']);
		assert.deepEqual(scrubRangeIds(ORDER, 'd', 'b'), ['b', 'c', 'd']);
		assert.deepEqual(scrubRangeIds(ORDER, 'a', 'a'), ['a']);
		assert.deepEqual(scrubRangeIds(ORDER, 'a', 'missing'), []);
	});
});
