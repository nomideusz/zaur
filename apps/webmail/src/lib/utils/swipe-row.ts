export const SWIPE_ACTION_WIDTH = 72;

export type SwipeSide = 'leading' | 'trailing';

export function swipeRevealWidth(actionCount: number): number {
	return Math.max(0, actionCount) * SWIPE_ACTION_WIDTH;
}

/**
 * Strength tiers: dragging past the reveal arms the primary action (tier 1);
 * a deeper pull arms the secondary action (tier 2) when one exists. Release
 * commits the armed action — the modern two-stage mail-app swipe.
 */
export interface SwipeTierThresholds {
	tier1: number;
	tier2: number;
	/** Hard drag limit — the row never fully leaves the viewport mid-drag. */
	maxDrag: number;
}

export function swipeTierThresholds(revealWidth: number, rowWidth: number): SwipeTierThresholds {
	const tier1 = Math.max(revealWidth + 24, rowWidth * 0.38);
	const tier2 = rowWidth * 0.68;
	return { tier1, tier2, maxDrag: rowWidth * 0.92 };
}

/** Which action a release at `offset` commits: 0 = none (snap), 1 = primary, 2 = secondary. */
export function swipeArmedTier(
	offset: number,
	revealWidth: number,
	rowWidth: number,
	actionCount: number
): 0 | 1 | 2 {
	if (actionCount <= 0 || revealWidth <= 0 || rowWidth <= 0) return 0;
	const distance = Math.abs(offset);
	const { tier1, tier2 } = swipeTierThresholds(revealWidth, rowWidth);
	if (actionCount > 1 && distance >= tier2) return 2;
	if (distance >= tier1) return 1;
	return 0;
}

/**
 * Clamp drag offset: positive = leading actions, negative = trailing.
 * The drag runs 1:1 past the reveal (full-swipe territory) up to maxDrag.
 */
export function clampSwipeOffset(
	offset: number,
	leadingWidth: number,
	trailingWidth: number,
	rowWidth = 0
): number {
	const limit = (revealWidth: number) =>
		rowWidth > 0 && revealWidth > 0
			? Math.max(revealWidth, swipeTierThresholds(revealWidth, rowWidth).maxDrag)
			: revealWidth;
	if (offset > 0) return Math.min(offset, limit(leadingWidth));
	if (offset < 0) return Math.max(offset, -limit(trailingWidth));
	return 0;
}

export function snapSwipeOffset(
	offset: number,
	leadingWidth: number,
	trailingWidth: number,
	openThreshold = 36
): { offset: number; side: SwipeSide | null } {
	if (offset > openThreshold && leadingWidth > 0) {
		return { offset: leadingWidth, side: 'leading' };
	}
	if (offset < -openThreshold && trailingWidth > 0) {
		return { offset: -trailingWidth, side: 'trailing' };
	}
	return { offset: 0, side: null };
}
