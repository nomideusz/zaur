<script lang="ts">
	import '@fontsource/libre-franklin/400.css';
	import '@fontsource/libre-franklin/500.css';
	import '@fontsource/libre-franklin/600.css';
	import '@fontsource/libre-franklin/700.css';
	import '@fontsource/ibm-plex-mono/400.css';
	import '@fontsource/ibm-plex-mono/500.css';
	import '@fontsource/ibm-plex-mono/600.css';
	import './layout.css';
	import { prefs } from '#lib/settings.svelte.ts';

	let { children } = $props();

	/**
	 * The theme is a `data-theme` on <html>: "light" or "dark" when chosen,
	 * absent for "system", where `prefers-color-scheme` decides. `app.html`
	 * writes the same attribute before first paint from the stored prefs, so
	 * this only has to keep it in step with changes made on the settings page.
	 */
	$effect(() => {
		const root = document.documentElement;
		if (prefs.theme === 'system') delete root.dataset.theme;
		else root.dataset.theme = prefs.theme;
	});
</script>

{@render children()}
