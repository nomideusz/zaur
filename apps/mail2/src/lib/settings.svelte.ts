/** The reactive prefs object — the pure shape and parser live in `settings.ts`. */
import { DEFAULT_PREFS, parsePrefs, type Prefs } from './settings';

export * from './settings';

const KEY = 'mail2.prefs';

export const prefs = $state<Prefs>(
	typeof localStorage === 'undefined'
		? { ...DEFAULT_PREFS }
		: parsePrefs(localStorage.getItem(KEY))
);

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
	prefs[key] = value;
	if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(prefs));
}
