import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	define: {
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development')
	},
	server: {
		fs: {
			allow: ['../..']
		}
	},
	plugins: [
		tailwindcss(),
		sveltekit()
	]
});
