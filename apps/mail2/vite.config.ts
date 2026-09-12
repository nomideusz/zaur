import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// SvelteKit 3: configuration lives here, not in svelte.config.js (which is no
// longer read). `adapter` and `experimental` are top-level plugin options; the
// `experimental` namespace is shared with vite-plugin-svelte.
export default defineConfig({
	server: {
		// Vite rejects requests whose Host header is neither localhost nor in
		// this list — this is the cloudflared tunnel name used for
		// on-the-internet testing (README → "Testing over the network").
		allowedHosts: ['mail2-dev.zaur.app']
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				experimental: {
					async: true
				}
			},
			experimental: {
				remoteFunctions: true
			}
		})
	]
});
