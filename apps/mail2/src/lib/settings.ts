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
	/**
	 * Show each sender's identity tile in the list and on the reader's sender
	 * card. Off by default: the rail already carries the channel and the tile is
	 * the row's widest ornament, so a list without it fits more mail on a phone.
	 * The account's own tile in the top bar is chrome, not a sender, and stays.
	 */
	showAvatars: boolean;
	/** Start each folder on the Unseen filter instead of All. */
	unseenByDefault: boolean;
	/**
	 * Load a message's remote images without asking. Off by default: a remote
	 * image is how a tracking pixel tells the sender you opened the mail.
	 */
	showRemoteImages: boolean;
	/** Light, dark, or whatever the OS says. A device preference: a desk and a phone differ. */
	theme: Theme;
	/** New messages start as plain text rather than rich. Set in Settings; a panel's own switch is per draft. */
	composePlain: boolean;
	/** Let the server ask an AI (TypeSafe) to categorise mail no rule caught. Opt-in: it sends sender, subject and preview off-site. */
	aiCategories: boolean;
};

export type Theme = 'system' | 'light' | 'dark';
export const THEMES: Theme[] = ['system', 'light', 'dark'];

export const DEFAULT_PREFS: Prefs = {
	sidebarOpen: true,
	listWidth: 480,
	pageSize: 50,
	markReadOnOpen: true,
	showPreview: true,
	showAvatars: false,
	unseenByDefault: false,
	showRemoteImages: false,
	theme: 'system',
	composePlain: false,
	aiCategories: false
};

/**
 * The preferences that belong to the **account**, not to the browser.
 *
 * The other two are deliberately excluded, and syncing them would be a
 * regression rather than a feature: `listWidth` is a pixel width for one
 * screen — push a 760px list from a wide monitor to a laptop and it eats the
 * reader — and `sidebarOpen` means different things on a phone, where the
 * sidebar is an overlay drawer, than on a desktop where it is a column.
 *
 * A device-shaped preference stored per account is worse than one stored per
 * device, so these are the ones that travel.
 */
export const ACCOUNT_PREF_KEYS = [
	'pageSize',
	'markReadOnOpen',
	'showPreview',
	'showAvatars',
	'unseenByDefault',
	'showRemoteImages',
	'composePlain',
	'aiCategories'
] as const satisfies readonly (keyof Prefs)[];

export type AccountPrefs = Pick<Prefs, (typeof ACCOUNT_PREF_KEYS)[number]>;

export function accountPrefsOf(prefs: Prefs): AccountPrefs {
	return {
		pageSize: prefs.pageSize,
		markReadOnOpen: prefs.markReadOnOpen,
		showPreview: prefs.showPreview,
		showAvatars: prefs.showAvatars,
		unseenByDefault: prefs.unseenByDefault,
		showRemoteImages: prefs.showRemoteImages,
		composePlain: prefs.composePlain,
		aiCategories: prefs.aiCategories
	};
}

/**
 * Take the account's copy over the defaults, then let anything already set on
 * this device win — a preference the person changed here is the newer intent,
 * and only what they touch is pushed back up.
 */
export function mergeAccountPrefs(local: Prefs, remote: Partial<AccountPrefs> | null): Prefs {
	if (!remote) return local;
	const merged = { ...local };
	for (const key of ACCOUNT_PREF_KEYS) {
		const value = remote[key];
		if (value === undefined) continue;
		if (typeof value !== typeof DEFAULT_PREFS[key]) continue;
		(merged as Record<string, unknown>)[key] = value;
	}
	if (!PAGE_SIZES.includes(merged.pageSize)) merged.pageSize = DEFAULT_PREFS.pageSize;
	return merged;
}

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
	if (!THEMES.includes(next.theme)) next.theme = DEFAULT_PREFS.theme;
	return next;
}
