export const SWIPE_ACTION_WIDTH = 72;

export type SwipeSide = 'leading' | 'trailing';

export function swipeRevealWidth(actionCount: number): number {
	return Math.max(0, actionCount) * SWIPE_ACTION_WIDTH;
}

/** Clamp drag offset: positive = leading actions, negative = trailing. */
export function clampSwipeOffset(
	offset: number,
	leadingWidth: number,
	trailingWidth: number
): number {
	if (offset > 0) return Math.min(offset, leadingWidth);
	if (offset < 0) return Math.max(offset, -trailingWidth);
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

/** Full swipe past this ratio of reveal width triggers the primary action. */
export function shouldCommitSwipeAction(offset: number, revealWidth: number): boolean {
	if (revealWidth <= 0) return false;
	return Math.abs(offset) >= revealWidth * 1.35;
}
