/** Pure helpers for list-cursor navigation and range selection. */

export type CursorListItem = { id: string };

/**
 * Move the cursor by `delta` within `list`.
 * - Empty list → null
 * - No current id → first item when delta ≥ 0, last when delta < 0
 * - Clamped to list bounds (no wrap)
 */
export function moveCursor(
	list: readonly CursorListItem[],
	currentId: string | null,
	delta: number
): string | null {
	if (!list.length) return null;

	if (!currentId) {
		return delta < 0 ? list[list.length - 1]!.id : list[0]!.id;
	}

	const index = list.findIndex((item) => item.id === currentId);
	if (index < 0) {
		return delta < 0 ? list[list.length - 1]!.id : list[0]!.id;
	}

	const next = Math.max(0, Math.min(list.length - 1, index + delta));
	return list[next]!.id;
}

/** Inclusive range of ids between anchor and target in list order. */
export function rangeIds(
	list: readonly CursorListItem[],
	anchorId: string,
	targetId: string
): string[] {
	const anchorIndex = list.findIndex((item) => item.id === anchorId);
	const targetIndex = list.findIndex((item) => item.id === targetId);
	if (anchorIndex < 0 && targetIndex < 0) return [];
	if (anchorIndex < 0) return [targetId];
	if (targetIndex < 0) return [anchorId];

	const start = Math.min(anchorIndex, targetIndex);
	const end = Math.max(anchorIndex, targetIndex);
	const ids: string[] = [];
	for (let i = start; i <= end; i++) {
		ids.push(list[i]!.id);
	}
	return ids;
}

/**
 * Pick a sensible cursor when the list changes.
 * Prefer `preferredId` if still present, else keep `currentId` if present, else first item.
 */
export function resolveCursorId(
	list: readonly CursorListItem[],
	currentId: string | null,
	preferredId?: string | null
): string | null {
	if (!list.length) return null;
	if (preferredId && list.some((item) => item.id === preferredId)) return preferredId;
	if (currentId && list.some((item) => item.id === currentId)) return currentId;
	return list[0]!.id;
}
