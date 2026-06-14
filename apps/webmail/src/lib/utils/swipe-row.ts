export type SwipeSide = 'leading' | 'trailing';

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
 * Distance past which releasing commits the action. One threshold per
 * direction — no short/long ambiguity: drag past it to act, release short to
 * spring back.
 */
export function swipeCommitThreshold(rowWidth: number): number {
	if (rowWidth <= 0) return 80;
	return Math.min(Math.max(rowWidth * 0.3, 72), 140);
}
