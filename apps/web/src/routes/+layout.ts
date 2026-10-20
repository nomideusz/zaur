import { extractLocale } from '@nomideusz/svelte-i18n';
import { routing } from '#lib/i18n-routing';

// Fully static marketing site — prerender every route at build time.
export const prerender = true;
export const trailingSlash = 'never';

// The URL prefix decides the language: / is English, /pl, /de and /ua the rest.
export const load = ({ url }) => ({ locale: extractLocale(url.pathname, routing).locale });
