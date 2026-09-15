/**
 * Client-side preferences — the shape, defaults and parser. The reactive
 * object that owns them lives in `settings.svelte.ts`; server-backed settings
 * (display name) live in `settings.remote.ts`.
 */
export type Prefs = {
	sidebarOpen: boolean;
	listWidth: number;
	/** Messages fetched per folder view. */
	pageSize: number;
	/** Mark a thread seen when it is opened in the reader. */
	markReadOnOpen: boolean;
	/** Show the snippet line under each subject in the list. */
	showPreview: boolean;
	/** Start each folder on the Unseen filter instead of All. */
	unseenByDefault: boolean;
};

export const DEFAULT_PREFS: Prefs = {
	sidebarOpen: true,
	listWidth: 480,
	pageSize: 50,
	markReadOnOpen: true,
	showPreview: true,
	unseenByDefault: false
};

export const LIST_MIN = 380;
export const LIST_MAX = 760;
export const PAGE_SIZES = [25, 50, 100, 200];

/** Merge stored JSON over the defaults, dropping anything malformed. */
export function parsePrefs(raw: string | null): Prefs {
	if (!raw) return { ...DEFAULT_PREFS };
	let stored: unknown;
	try {
		stored = JSON.parse(raw);
	} catch {
		return { ...DEFAULT_PREFS };
	}
	if (!stored || typeof stored !== 'object') return { ...DEFAULT_PREFS };
	const next = { ...DEFAULT_PREFS };
	for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
		if (!(key in next)) continue;
		if (typeof value !== typeof next[key as keyof Prefs]) continue;
		(next as Record<string, unknown>)[key] = value;
	}
	next.listWidth = Math.min(LIST_MAX, Math.max(LIST_MIN, next.listWidth));
	if (!PAGE_SIZES.includes(next.pageSize)) next.pageSize = DEFAULT_PREFS.pageSize;
	return next;
}
