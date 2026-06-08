import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import uws from 'svelte-adapter-uws/vite';
import realtime from 'svelte-realtime/vite';
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
		sveltekit(),
		uws(),
		realtime()
	]
});
