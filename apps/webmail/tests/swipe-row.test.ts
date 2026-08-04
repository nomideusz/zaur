import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	clampSwipeOffset,
	swipeArmLevel,
	swipeCommitThreshold,
	swipeDeepThreshold
} from '../src/lib/utils/swipe-row.ts';

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

	it('short threshold scales with the row, clamped to a sane range', () => {
		assert.equal(swipeCommitThreshold(400), 88); // 22% of row
		assert.equal(swipeCommitThreshold(200), 56); // floor
		assert.equal(swipeCommitThreshold(1000), 110); // ceiling
		assert.equal(swipeCommitThreshold(0), 64); // fallback
	});

	it('deep threshold sits beyond the short threshold', () => {
		assert.equal(swipeDeepThreshold(400), 192); // 48% of row
		assert.equal(swipeDeepThreshold(200), 120); // floor
		assert.equal(swipeDeepThreshold(1000), 220); // ceiling
		assert.ok(swipeDeepThreshold(400) > swipeCommitThreshold(400));
	});

	it('reports arm levels for staged swipe', () => {
		assert.equal(swipeArmLevel(0, ROW, 2), 0);
		assert.equal(swipeArmLevel(40, ROW, 2), 0);
		assert.equal(swipeArmLevel(88, ROW, 2), 1);
		assert.equal(swipeArmLevel(192, ROW, 2), 2);
		/* Single-action sides stay at level 1 even past the deep mark. */
		assert.equal(swipeArmLevel(250, ROW, 1), 1);
		assert.equal(swipeArmLevel(-192, ROW, 2), 2);
	});
});
