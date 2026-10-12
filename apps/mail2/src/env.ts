import { defineEnvVars } from '@sveltejs/kit/env';

// Kit 3 only hands the browser the variables declared here. Server-side config
// is still read straight from process.env. Branding is read at runtime, so one
// image serves any deployment; #lib/brand derives the rest from these.
export const variables = defineEnvVars({
	PUBLIC_TRACEWAY_DSN: {
		public: true,
		schema: (value) => value?.trim() || undefined,
		description: 'Traceway DSN, {token}@{url}/api/report. Unset = error tracking off.'
	},
	PUBLIC_APP_NAME: {
		public: true,
		schema: (value) => value?.trim() || 'Webmail',
		description: 'Product name: tab titles, the installed app, the authenticator entry. Default "Webmail".'
	},
	PUBLIC_BRAND_NAME: {
		public: true,
		schema: (value) => value?.trim() || undefined,
		description: 'Wordmark on the sign-in card, and the "{brand} address" / "{brand} Meet" wording. Unset = the app name and neutral wording.'
	},
	PUBLIC_MAIL_DOMAIN: {
		public: true,
		schema: (value) => value?.trim() || 'example.com',
		description: 'Domain in address placeholders (you@…). Default example.com.'
	},
	PUBLIC_APP_ICON: {
		public: true,
		schema: (value) => (value?.trim() === 'zaur' ? 'zaur' : 'mail'),
		description: 'Icon set: "mail" (a plain envelope, default) or "zaur" (the Z that folds an envelope).'
	}
});
