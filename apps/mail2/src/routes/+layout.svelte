<script lang="ts">
	import './layout.css';
	import { afterNavigate } from '$app/navigation';
	// Imported here for its listener: the browser offers to install once, early.
	import '#lib/install.svelte.ts';
	import { installKeyboardInset } from '#lib/keyboard';
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
		paintSystemBar();
	});

	/**
	 * `theme-color` — Android's toolbar, the installed app's title bar, iOS'
	 * status bar before 26 — is whatever colour the page has under its top edge:
	 * the header's surface in the app, the canvas on sign-in and the error card,
	 * either one in the theme that is actually showing. Read off the page rather
	 * than kept in a table per screen and theme, which is how a chosen Dark came
	 * to sit under a white bar.
	 */
	function paintSystemBar() {
		let color = '';
		for (let el = document.elementFromPoint(innerWidth / 2, 1); el && !color; el = el.parentElement) {
			const background = getComputedStyle(el).backgroundColor;
			// Only a solid one: `rgba(…)` and `… / alpha` are a scrim or nothing at all.
			if (!background.startsWith('rgba(') && !background.includes('/')) color = background;
		}
		if (!color) return;
		for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = color;
	}

	// Each screen has its own top edge; and with "system", the OS can change its mind.
	afterNavigate(paintSystemBar);
	$effect(() => {
		const scheme = matchMedia('(prefers-color-scheme: dark)');
		scheme.addEventListener('change', paintSystemBar);
		return () => scheme.removeEventListener('change', paintSystemBar);
	});

	installKeyboardInset();
</script>

{@render children()}
