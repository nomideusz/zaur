/** The reactive prefs object — the pure shape and parser live in `settings.ts`. */
import { untrack } from 'svelte';
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
let push: ((changed: Partial<AccountPrefs>) => Promise<unknown>) | null = null;
let notSaved: (cause: unknown) => void = () => {};
let synced = false;

function persist() {
	if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(prefs));
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
	const before = prefs[key];
	prefs[key] = value;
	persist();
	if (!synced || !push) return;
	if (!(ACCOUNT_PREF_KEYS as readonly string[]).includes(key)) return;
	// The account's copy wins on the next load, so a change that never reached
	// it would be undone then without a word. Put back now and said, it is seen.
	push({ [key]: value } as Partial<AccountPrefs>).catch((cause) => {
		// Unless it was changed again since: that change has its own push.
		if (prefs[key] === value) {
			prefs[key] = before;
			persist();
		}
		notSaved(cause);
	});
}

/**
 * Adopt the account's copy, then start pushing changes to it.
 *
 * The account wins over this device's defaults but not over what is already
 * stored here — a preference set on this device is the more recent intent, and
 * the merge is per key, so a device that has never seen a key still gets it.
 *
 * Callers run this from an `$effect`, so it is untracked: it reads every pref
 * and a remote command bumps its own `$state` pending count, and either would
 * make the effect re-run itself — a first sign-in used to push dozens of times.
 */
export function adoptAccountPrefs(
	remote: Partial<AccountPrefs> | null,
	pushChanges: (changed: Partial<AccountPrefs>) => Promise<unknown>,
	/** Tells the person a change did not reach the account (and was put back). */
	onNotSaved: (cause: unknown) => void
) {
	untrack(() => {
		const merged = mergeAccountPrefs({ ...prefs }, remote);
		for (const key of ACCOUNT_PREF_KEYS) prefs[key] = merged[key] as never;
		persist();
		push = pushChanges;
		notSaved = onNotSaved;
		synced = true;

		// First device to sign in seeds the account, so a second one has something
		// to adopt rather than starting from defaults again.
		// Quietly: nothing was changed by hand, and the next device to sign in tries again.
		if (!remote) void pushChanges(accountPrefsOf(prefs)).catch(() => {});
	});
}
