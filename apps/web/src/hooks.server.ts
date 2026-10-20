import type { Handle } from '@sveltejs/kit/hooks';
import { extractLocale } from '@nomideusz/svelte-i18n';
import { routing } from '#lib/i18n-routing';

// The site is prerendered, so this runs at build time only: it writes each
// page's <html lang>. createLocaleHandle's redirect and cookie need a live
// server, which a static site does not have; the URL alone picks the language.
export const handle: Handle = ({ event, resolve }) => {
	const { locale } = extractLocale(event.url.pathname, routing);
	return resolve(event, { transformPageChunk: ({ html }) => html.replace('%lang%', locale) });
};
