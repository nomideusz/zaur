/** Pure helpers for list keyboard triage (select-star chords, etc.). */

export type SelectStarFilter = 'all' | 'normal' | 'new' | 'none';

/** Map a key pressed after `*` to a selection filter. */
export function selectStarFilter(key: string): SelectStarFilter | null {
	switch (key.toLowerCase()) {
		case 'a':
			return 'all';
		case 'n':
			return 'none';
		case 'u':
			return 'new';
		case 'r':
			return 'normal';
		default:
			return null;
	}
}

export type TriageMode = 'list' | 'selecting' | 'reader';

export function triageMode(options: {
	hasThread: boolean;
	hasSelection: boolean;
}): TriageMode {
	if (options.hasSelection) return 'selecting';
	if (options.hasThread) return 'reader';
	return 'list';
}
