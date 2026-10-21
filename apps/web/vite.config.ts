import { fileURLToPath } from 'node:url';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { geometrize } from '@nomideusz/svelte-geometrize/vite';

// SvelteKit 3: configuration lives here, not in svelte.config.js (which is no longer read).
export default defineConfig({
	plugins: [
		// ?geometrize imports: the captures' triangle placeholders, fitted at build time.
		// The fits are committed (keyed by image content + options), so a clean Docker
		// build reuses them instead of spending a minute re-fitting unchanged captures.
		geometrize({ shapes: 60, cacheDir: fileURLToPath(new URL('./geometrize', import.meta.url)) }),
		sveltekit({
			// Fully static marketing site — prerendered to ./dist, served by static-server.mjs.
			adapter: adapter({
				pages: 'dist',
				assets: 'dist',
				fallback: '404.html',
				precompress: false,
				strict: true
			}),
			// One page per language: / is English, the rest sit under their prefix.
			prerender: { entries: ['*', '/pl', '/de', '/fr', '/ua'] },
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			}
		})
	]
});
