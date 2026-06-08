import adapter from 'svelte-adapter-uws';

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
