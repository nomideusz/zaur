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
	optimizeDeps: {
		// svelte-remixicon ships `.svelte` icon files whose exports map only defines a
		// `svelte` (and `types`) condition for its `./*.svelte` subpaths. Vite's cold
		// dependency scan resolves via rolldown's *native* resolver, which doesn't apply
		// the `svelte` condition — so it fails on e.g. `svelte-remixicon/RiFontSize2.svelte`
		// ("Package subpath is not defined by exports") and aborts pre-bundling for the
		// whole app. `exclude` alone does NOT fix it (the native scan resolves before the
		// JS exclude hook runs), so we also teach the scan resolver the `svelte` condition.
		exclude: ['svelte-remixicon'],
		rolldownOptions: {
			resolve: {
				conditionNames: ['svelte', 'browser', 'import', 'require', 'module', 'development', 'default']
			}
		}
	},
	plugins: [
		tailwindcss(),
		sveltekit()
	]
});
