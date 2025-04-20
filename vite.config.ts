import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		proxy: {
			'/api/cors-proxy': {
				target: 'https://api.allorigins.win/raw?url=',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/cors-proxy/, '')
			}
		}
	}
});
