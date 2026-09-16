/** The reactive prefs object — the pure shape and parser live in `settings.ts`. */
import {
	ACCOUNT_PREF_KEYS,
	DEFAULT_PREFS,
	accountPrefsOf,
	mergeAccountPrefs,
	parsePrefs,
	type AccountPrefs,
	type Prefs
} from './settings';

export * from './settings';

const KEY = 'mail2.prefs';

export const prefs = $state<Prefs>(
	typeof localStorage === 'undefined'
		? { ...DEFAULT_PREFS }
		: parsePrefs(localStorage.getItem(KEY))
);

/**
 * Set by the shell once the account's copy is known. Until then nothing is
 * pushed: a fresh tab must not overwrite the account with its own defaults
 * before it has heard what the account already says.
 */
let push: ((changed: Partial<AccountPrefs>) => void) | null = null;
let synced = false;

function persist() {
	if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(prefs));
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
	prefs[key] = value;
	persist();
	if (!synced || !push) return;
	if (!(ACCOUNT_PREF_KEYS as readonly string[]).includes(key)) return;
	push({ [key]: value } as Partial<AccountPrefs>);
}

/**
 * Adopt the account's copy, then start pushing changes to it.
 *
 * The account wins over this device's defaults but not over what is already
 * stored here — a preference set on this device is the more recent intent, and
 * the merge is per key, so a device that has never seen a key still gets it.
 */
export function adoptAccountPrefs(
	remote: Partial<AccountPrefs> | null,
	pushChanges: (changed: Partial<AccountPrefs>) => void
) {
	const merged = mergeAccountPrefs({ ...prefs }, remote);
	for (const key of ACCOUNT_PREF_KEYS) prefs[key] = merged[key] as never;
	persist();
	push = pushChanges;
	synced = true;

	// First device to sign in seeds the account, so a second one has something
	// to adopt rather than starting from defaults again.
	if (!remote) pushChanges(accountPrefsOf(prefs));
}
