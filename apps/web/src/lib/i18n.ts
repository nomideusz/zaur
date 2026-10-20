import { createI18n } from '@nomideusz/svelte-i18n';
import { routing } from './i18n-routing';
import en from './messages/en.json';
import pl from './messages/pl.json';
import de from './messages/de.json';
import fr from './messages/fr.json';
import uk from './messages/uk.json';

// Synchronous loader: every catalog is bundled, so a prerendered page has its
// language on the first render and hydrates without a flash.
const messages: Record<string, Record<string, string>> = { en, pl, de, fr, uk };

export const i18n = createI18n({
	defaultLocale: routing.defaultLocale,
	supportedLocales: routing.supportedLocales,
	loader: (locale) => messages[locale] ?? en
});

export const t = i18n.t;

/** Every message under `prefix.0`, `prefix.1`… in order: lists stay flat JSON keys. */
export function list(prefix: string): string[] {
	const out: string[] = [];
	for (let i = 0; ; i++) {
		const key = `${prefix}.${i}`;
		const v = t(key);
		if (v === key) return out;
		out.push(v);
	}
}

/** Label/value rows stored as `prefix.0.k` / `prefix.0.v`… */
export function pairs(prefix: string): [string, string][] {
	const out: [string, string][] = [];
	for (let i = 0; ; i++) {
		const key = `${prefix}.${i}.k`;
		const k = t(key);
		if (k === key) return out;
		out.push([k, t(`${prefix}.${i}.v`)]);
	}
}
