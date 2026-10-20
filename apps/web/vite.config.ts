import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// SvelteKit 3: configuration lives here, not in svelte.config.js (which is no longer read).
export default defineConfig({
	plugins: [
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
