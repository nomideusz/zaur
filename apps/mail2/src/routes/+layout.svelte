<script lang="ts">
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
