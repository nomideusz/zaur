import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	clampSwipeOffset,
	snapSwipeOffset,
	swipeArmedTier,
	swipeRevealWidth,
	swipeTierThresholds
} from '../src/lib/utils/swipe-row.ts';

const ROW = 400;

describe('swipe-row', () => {
	it('computes reveal width from action count', () => {
		assert.equal(swipeRevealWidth(0), 0);
		assert.equal(swipeRevealWidth(2), 144);
	});

	it('clamps offset to reveal bounds without a row width', () => {
		assert.equal(clampSwipeOffset(120, 72, 72), 72);
		assert.equal(clampSwipeOffset(-120, 72, 72), -72);
		assert.equal(clampSwipeOffset(10, 72, 72), 10);
	});

	it('allows dragging past the reveal up to maxDrag when row width is known', () => {
		const { maxDrag } = swipeTierThresholds(72, ROW);
		assert.equal(clampSwipeOffset(200, 72, 72, ROW), 200);
		assert.equal(clampSwipeOffset(1000, 72, 72, ROW), maxDrag);
		assert.equal(clampSwipeOffset(-1000, 72, 72, ROW), -maxDrag);
	});

	it('snaps open past threshold', () => {
		assert.deepEqual(snapSwipeOffset(40, 72, 72), { offset: 72, side: 'leading' });
		assert.deepEqual(snapSwipeOffset(-40, 72, 72), { offset: -72, side: 'trailing' });
		assert.deepEqual(snapSwipeOffset(10, 72, 72), { offset: 0, side: null });
	});

	it('arms tier 1 past the first threshold and tier 2 past the second', () => {
		const { tier1, tier2 } = swipeTierThresholds(144, ROW);
		assert.equal(swipeArmedTier(tier1 - 1, 144, ROW, 2), 0);
		assert.equal(swipeArmedTier(tier1 + 1, 144, ROW, 2), 1);
		assert.equal(swipeArmedTier(tier2 + 1, 144, ROW, 2), 2);
		assert.equal(swipeArmedTier(-(tier2 + 1), 144, ROW, 2), 2);
	});

	it('caps the armed tier at the action count', () => {
		const { tier2 } = swipeTierThresholds(72, ROW);
		assert.equal(swipeArmedTier(tier2 + 1, 72, ROW, 1), 1);
		assert.equal(swipeArmedTier(tier2 + 1, 72, ROW, 0), 0);
	});

	it('tier 1 always sits beyond the reveal width', () => {
		const { tier1 } = swipeTierThresholds(144, 320);
		assert.ok(tier1 > 144);
	});
});
