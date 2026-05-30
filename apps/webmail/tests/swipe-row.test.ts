import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	clampSwipeOffset,
	shouldCommitSwipeAction,
	snapSwipeOffset,
	swipeRevealWidth
} from '../src/lib/utils/swipe-row.ts';

describe('swipe-row', () => {
	it('computes reveal width from action count', () => {
		assert.equal(swipeRevealWidth(0), 0);
		assert.equal(swipeRevealWidth(2), 144);
	});

	it('clamps offset to reveal bounds', () => {
		assert.equal(clampSwipeOffset(120, 72, 72), 72);
		assert.equal(clampSwipeOffset(-120, 72, 72), -72);
		assert.equal(clampSwipeOffset(10, 72, 72), 10);
	});

	it('snaps open past threshold', () => {
		assert.deepEqual(snapSwipeOffset(40, 72, 72), { offset: 72, side: 'leading' });
		assert.deepEqual(snapSwipeOffset(-40, 72, 72), { offset: -72, side: 'trailing' });
		assert.deepEqual(snapSwipeOffset(10, 72, 72), { offset: 0, side: null });
	});

	it('commits full swipe actions', () => {
		assert.equal(shouldCommitSwipeAction(100, 72), true);
		assert.equal(shouldCommitSwipeAction(50, 72), false);
	});
});
