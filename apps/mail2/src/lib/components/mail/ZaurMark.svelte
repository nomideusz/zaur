<script lang="ts">
	import { page } from '$app/state';
	import { appName, hasBird, MARK } from '#lib/brand';
	import BirdMark from '../BirdMark.svelte';

	/**
	 * The brand mark and the shell's home button (#lib/brand): Zaur's bird, in
	 * its own colours as on the app icon, or elsewhere a plain envelope in the
	 * `--z-strong` ink and 1.3 stroke of the glyphs beside it. It is a button
	 * among buttons, the same `btn-tactile` body. Clicking goes home (Mail); on
	 * Mail it marks itself the current page.
	 *
	 * The mark never carries a count. The bird comes from `scripts/zaur-bird.py`
	 * and the envelope from `scripts/generate-icons.py`, which draw every icon in
	 * `static/`.
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

	let { href = '/', label = appName, onNavigate, class: className = '' }: Props = $props();

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
	{#if hasBird}
		<BirdMark class="w-[22px]" />
	{:else}
		<svg class="size-4 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<g stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
				<path d={MARK.faint} stroke-opacity="0.4" />
				<path d={MARK.bold} />
			</g>
		</svg>
	{/if}
</a>
