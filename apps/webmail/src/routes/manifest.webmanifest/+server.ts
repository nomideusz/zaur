import { json, type RequestHandler } from '@sveltejs/kit';
import { appConfig } from '$lib/config';

// The PWA manifest is served dynamically so the install name follows
// PUBLIC_APP_NAME instead of shipping a baked-in brand.
export const prerender = false;

export const GET: RequestHandler = () => {
	const name = appConfig.appName;
	// PWA short_name should stay ~12 chars; fall back to the first word.
	const shortName = name.length <= 12 ? name : name.split(/\s+/)[0].slice(0, 12);
	return json(
		{
			name,
			short_name: shortName,
			description: 'Fast, offline-capable webmail.',
			theme_color: '#406bbf',
			background_color: '#ffffff',
			display: 'standalone',
			scope: '/',
			start_url: '/',
			orientation: 'portrait-primary',
			categories: ['productivity', 'utilities'],
			icons: [
				{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
				{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
				{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
			]
		},
		{
			headers: {
				'Content-Type': 'application/manifest+json',
				'Cache-Control': 'public, max-age=3600'
			}
		}
	);
};
