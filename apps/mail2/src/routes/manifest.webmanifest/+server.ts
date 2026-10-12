import { appName, iconBase } from '#lib/brand';
import { PUBLIC_BRAND_NAME } from '$app/env/public';
import type { RequestHandler } from './$types';

/** The installed app: a route rather than a static file, so it carries this deployment's name and icons. */
const manifest = JSON.stringify({
	id: '/',
	name: appName,
	short_name: appName,
	description: PUBLIC_BRAND_NAME ? `Mail for your ${PUBLIC_BRAND_NAME} account.` : 'Mail, calendar and contacts in the browser.',
	start_url: '/',
	scope: '/',
	display: 'standalone',
	background_color: '#ffffff',
	theme_color: '#ffffff',
	categories: ['productivity', 'business'],
	shortcuts: [
		{ name: 'New message', url: '/?to=' },
		{ name: 'Calendar', url: '/calendar' },
		{ name: 'Contacts', url: '/contacts' }
	],
	icons: [
		{ src: `${iconBase}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
		{ src: `${iconBase}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
		{ src: `${iconBase}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
	]
});

export const GET: RequestHandler = () =>
	new Response(manifest, { headers: { 'content-type': 'application/manifest+json' } });
