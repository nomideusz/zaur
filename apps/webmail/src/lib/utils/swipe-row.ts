export type SwipeSide = 'leading' | 'trailing';

/** 0 = not armed, 1 = short tier, 2 = deep tier. */
export type SwipeArmLevel = 0 | 1 | 2;

/* Past this fraction of the row the drag rubber-bands so the row can't be
   flung off-screen mid-gesture. */
const MAX_DRAG_RATIO = 0.92;
const RUBBER_BAND = 0.3;

function resist(distance: number, max: number): number {
	if (max <= 0 || distance <= max) return distance;
	return max + (distance - max) * RUBBER_BAND;
}

/**
 * Clamp the drag offset (positive = leading, negative = trailing). The row
 * tracks the finger 1:1, then rubber-bands near full width. Sides without an
 * action don't move.
 */
export function clampSwipeOffset(
	offset: number,
	allowLeading: boolean,
	allowTrailing: boolean,
	rowWidth = 0
): number {
	const max = rowWidth > 0 ? rowWidth * MAX_DRAG_RATIO : Infinity;
	if (offset > 0) return allowLeading ? resist(offset, max) : 0;
	if (offset < 0) return allowTrailing ? -resist(-offset, max) : 0;
	return 0;
}

/**
 * Short-tier commit distance — releasing past this fires the everyday action
 * (Seen / Trash). Deep tier uses {@link swipeDeepThreshold}.
 */
export function swipeCommitThreshold(rowWidth: number): number {
	if (rowWidth <= 0) return 64;
	return Math.min(Math.max(rowWidth * 0.22, 56), 110);
}

/**
 * Deep-tier commit distance — releasing past this fires the stronger action
 * (Archive / Spam / Highlight fallback).
 */
export function swipeDeepThreshold(rowWidth: number): number {
	if (rowWidth <= 0) return 140;
	return Math.min(Math.max(rowWidth * 0.48, 120), 220);
}

/**
 * Which swipe tier is armed for the current drag distance.
 * Level 2 requires a second action on that side; otherwise deep travel still
 * reports level 1 so a single-action side stays predictable.
 */
export function swipeArmLevel(
	offset: number,
	rowWidth: number,
	tierCount: number
): SwipeArmLevel {
	const distance = Math.abs(offset);
	if (distance <= 0 || tierCount <= 0) return 0;
	const short = swipeCommitThreshold(rowWidth);
	if (distance < short) return 0;
	if (tierCount < 2) return 1;
	const deep = swipeDeepThreshold(rowWidth);
	return distance >= deep ? 2 : 1;
}

/** @deprecated Prefer {@link swipeArmLevel}; kept for callers that only need a boolean. */
export function swipeIsArmed(offset: number, rowWidth: number, tierCount = 1): boolean {
	return swipeArmLevel(offset, rowWidth, tierCount) > 0;
}
