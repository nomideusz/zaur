import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clampSwipeOffset, swipeCommitThreshold } from '../src/lib/utils/swipe-row.ts';

const ROW = 400;
const MAX = ROW * 0.92; // 368

describe('swipe-row', () => {
	it('tracks the finger 1:1 within bounds', () => {
		assert.equal(clampSwipeOffset(100, true, true, ROW), 100);
		assert.equal(clampSwipeOffset(-100, true, true, ROW), -100);
	});

	it('does not move a side that has no action', () => {
		assert.equal(clampSwipeOffset(100, false, true, ROW), 0);
		assert.equal(clampSwipeOffset(-100, true, false, ROW), 0);
	});

	it('rubber-bands past the max drag', () => {
		// 468 → MAX + (468 - MAX) * 0.3 = 368 + 30 = 398
		assert.equal(clampSwipeOffset(468, true, true, ROW), 398);
		assert.equal(clampSwipeOffset(-468, true, true, ROW), -398);
		assert.ok(clampSwipeOffset(1000, true, true, ROW) < 1000);
	});

	it('commit threshold scales with the row, clamped to a sane range', () => {
		assert.equal(swipeCommitThreshold(400), 120); // 30% of row
		assert.equal(swipeCommitThreshold(200), 72); // floor
		assert.equal(swipeCommitThreshold(1000), 140); // ceiling
		assert.equal(swipeCommitThreshold(0), 80); // fallback
	});
});
