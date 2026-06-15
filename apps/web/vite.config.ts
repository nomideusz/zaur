import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	server: {
		fs: {
			// Allow importing the shared @zaur/ui CSS bundle from the monorepo root.
			allow: ['../..']
		}
	},
	plugins: [sveltekit()]
});
