import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		proxy: {
			'/api/cors-proxy': {
				target: 'https://api.allorigins.win/raw?url=',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/cors-proxy/, '')
			}
		},
		hmr: {
			// Use more stable HMR options
			protocol: 'ws',
			overlay: false
		},
		watch: {
			// Ignore news data files to prevent rebuilds when they change
			ignored: ['**/src/lib/server/data/**/*.json']
		},
		// Reduce the frequency of file system polling (in milliseconds)
		// Default is 100ms, increase to 10 seconds
		fs: {
			allow: [],
			strict: true
		}
	},
	// Add explicit watchOptions to ignore data files
	optimizeDeps: {
		exclude: ['src/lib/server/data']
	},
	// Handle RethinkDB module in build
	build: {
		rollupOptions: {
			external: [
				'rethinkdb',
				'rethinkdb-ts'
			],
			output: {
				// Prevent warnings about missing exports from external modules
				manualChunks(id) {
					if (id.includes('src/lib/server/check-news.ts') ||
						id.includes('src/lib/server/check-rethinkdb-data.js') ||
						id.includes('src/lib/server/create-indexes.ts') ||
						id.includes('src/lib/server/db.ts') ||
						id.includes('src/lib/server/migrations/')) {
						return 'legacy';
					}
				}
			}
		}
	}
});
