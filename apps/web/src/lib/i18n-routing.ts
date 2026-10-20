import type { LocaleRoutingConfig } from '@nomideusz/svelte-i18n';

// English stays at the bare root; the others live under a prefix. Ukrainian is
// served at /ua, the segment people recognise, while hreflang and <html lang>
// keep the language code uk.
export const routing: LocaleRoutingConfig = {
	defaultLocale: 'en',
	supportedLocales: ['en', 'pl', 'de', 'fr', 'uk'],
	prefixes: { uk: 'ua' }
};

/** Each language in its own name, for the switcher. */
export const languages: Record<string, string> = { en: 'English', pl: 'Polski', de: 'Deutsch', fr: 'Français', uk: 'Українська' };
/** The short form the header bar shows: the URL segment, upper-cased. */
export const short: Record<string, string> = { en: 'EN', pl: 'PL', de: 'DE', fr: 'FR', uk: 'UA' };
