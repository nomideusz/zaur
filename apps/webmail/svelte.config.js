import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
		experimental: {
			async: true
		}
	},
	kit: {
		adapter: adapter(),
		// SvelteKit nonces its own inline scripts + the app.html bootstrap, so script-src
		// no longer needs 'unsafe-inline'. style-src keeps it (Svelte emits inline styles).
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:', 'blob:', 'https:'],
				'font-src': ['self'],
				// All JMAP traffic is proxied same-origin through /api/jmap, so no
				// external connect-src is needed regardless of PUBLIC_JMAP_SERVER_URL.
				'connect-src': ['self'],
				'frame-ancestors': ['none'],
				'base-uri': ['self'],
				'form-action': ['self'],
				'object-src': ['none']
			}
		},
		files: {
			serviceWorker: 'src/service-worker.ts'
		},
		serviceWorker: {
			register: false
		},
		experimental: {
			remoteFunctions: true
		}
	}
};

export default config;
