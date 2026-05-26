import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	base: '/',
	define: {
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development')
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'service-worker.ts',
			registerType: 'autoUpdate',
			injectRegister: false,
			scope: '/',
			base: '/',
			devOptions: {
				enabled: true,
				type: 'module'
			},
			manifest: {
				name: 'ZAUR Webmail',
				short_name: 'ZAUR Mail',
				description: 'Fast, offline-capable webmail for ZAUR accounts.',
				theme_color: '#2563eb',
				background_color: '#ffffff',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				orientation: 'portrait-primary',
				categories: ['productivity', 'utilities'],
				icons: [
					{
						src: '/pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: '/pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,webmanifest}']
			},
			injectManifest: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,webmanifest}']
			}
		})
	]
});
