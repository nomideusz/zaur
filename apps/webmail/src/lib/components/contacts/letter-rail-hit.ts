/**
 * Which letter sits under a pointer during a drag along the A–Z rail.
 *
 * The rail's buttons are ~28px on phones, below the 44px touch guideline —
 * the same reason iOS index bars are scrubbed rather than tapped. Dragging
 * makes the small targets workable, and this resolves finger position to a
 * letter. Kept pure (rects in, index out) so it is testable without a DOM.
 */
export interface LetterBound {
	top: number;
	bottom: number;
}

/** Index of the letter at `y`, clamped to the rail's ends. -1 when empty. */
export function letterIndexAtY(bounds: readonly LetterBound[], y: number): number {
	if (bounds.length === 0) return -1;

	for (let i = 0; i < bounds.length; i++) {
		if (y >= bounds[i].top && y <= bounds[i].bottom) return i;
	}

	// Past either end — scrubbing off the rail should stick to the last letter
	// reached rather than snap back or deselect.
	if (y < bounds[0].top) return 0;
	if (y > bounds[bounds.length - 1].bottom) return bounds.length - 1;

	// In a gap between buttons: take whichever edge is closer.
	let best = 0;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (let i = 0; i < bounds.length; i++) {
		const distance = Math.min(Math.abs(y - bounds[i].top), Math.abs(y - bounds[i].bottom));
		if (distance < bestDistance) {
			bestDistance = distance;
			best = i;
		}
	}
	return best;
}
