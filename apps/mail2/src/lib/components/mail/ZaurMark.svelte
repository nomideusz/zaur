<script lang="ts">
	import { page } from '$app/state';

	/**
	 * The brand mark and the shell's home button: the Z fold — two bars and a
	 * 45° fold drawn as one continuous stroke. It is a button among buttons:
	 * the same `btn-tactile` body, the same `--z-strong` ink and 1.3 stroke as
	 * the glyphs beside it. Only the shape says Zaur. It wore two identity
	 * inks once, and a red-led mark on a white tile reads as someone else's
	 * mail. Clicking goes home (Mail); on Mail it marks itself the current page.
	 *
	 * The mark never carries a count. Its geometry is mirrored in
	 * `static/favicon.svg` and `scripts/generate-icons.py`.
	 */
	interface Props {
		/** Where home is. */
		href?: string;
		/** Accessible name; away from home the tooltip adds the way back. */
		label?: string;
		/** When already home, a click runs this instead of navigating — a phone drawer closes itself. */
		onNavigate?: () => void;
		/** Extra classes — e.g. to lift the mark out of a header's flow. */
		class?: string;
	}

	let { href = '/', label = 'Zaur Mail', onNavigate, class: className = '' }: Props = $props();

	const isHome = $derived(page.url.pathname === href);
	const title = $derived(isHome ? label : `${label} — back to Mail`);
</script>

<a
	{href}
	{title}
	aria-label={title}
	aria-current={isHome ? 'page' : undefined}
	data-sveltekit-preload-data="hover"
	onclick={(event) => {
		if (!onNavigate) return;
		// Closing the drawer removes this link. Only do that when we are already
		// home; otherwise the click never gets to navigate.
		if (isHome) {
			event.preventDefault();
			onNavigate();
		}
	}}
	class="btn-tactile !size-8 shrink-0 !p-0 {className}"
>
	<svg class="size-4 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<path d="M3 3H13L3 13H13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
</a>
