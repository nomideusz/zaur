/**
 * Pure helpers for touch scrub-select — after a long-press starts selection,
 * dragging across rows adds (or removes) them without layout jumps.
 */

export type ScrubSelectMode = 'add' | 'toggle';

/**
 * Given the visible list order and the row under the finger, return the next
 * selected-id set. Default mode adds the hit id; `toggle` flips membership.
 */
export function nextScrubSelection(
	orderedIds: readonly string[],
	selectedIds: ReadonlySet<string>,
	hitId: string,
	mode: ScrubSelectMode = 'add'
): Set<string> {
	const next = new Set(selectedIds);
	if (!orderedIds.includes(hitId)) return next;

	if (mode === 'toggle') {
		if (next.has(hitId)) next.delete(hitId);
		else next.add(hitId);
		return next;
	}

	next.add(hitId);
	return next;
}

/**
 * Inclusive range of ids between two anchors in list order (for future
 * shift-style scrub). Order-independent.
 */
export function scrubRangeIds(
	orderedIds: readonly string[],
	fromId: string,
	toId: string
): string[] {
	const from = orderedIds.indexOf(fromId);
	const to = orderedIds.indexOf(toId);
	if (from < 0 || to < 0) return fromId === toId && from >= 0 ? [fromId] : [];
	const start = Math.min(from, to);
	const end = Math.max(from, to);
	return orderedIds.slice(start, end + 1);
}
