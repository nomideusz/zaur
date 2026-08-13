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
				// Camera/mic tiles are blob: / mediastream: object URLs.
				'media-src': ['self', 'blob:', 'mediastream:'],
				// JMAP is same-origin (/api/jmap). LiveKit Cloud is the calendar
				// call SFU — signal is wss, region/validate is https, ICE may use TURN.
				'connect-src': [
					'self',
					'https://*.livekit.cloud',
					'wss://*.livekit.cloud',
					'https://*.turn.livekit.cloud',
					'wss://*.turn.livekit.cloud'
				],
				'worker-src': ['self', 'blob:'],
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
