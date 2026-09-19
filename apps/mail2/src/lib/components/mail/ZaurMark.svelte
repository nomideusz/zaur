<script lang="ts">
	import { page } from '$app/state';

	/**
	 * The brand mark and the shell's home button: the Z fold — two bars and a
	 * 45° fold drawn as one continuous ribbon in two identity inks, rose
	 * leading into the brand teal. Four micro-letters could never read at
	 * 16px; the fold holds its shape in the header, the favicon and the app
	 * icon alike. Its stroke is the 1.9 a brand mark needs next to the shell's
	 * 1.3 functional glyphs, with the same round caps and joins. Clicking goes
	 * home (Mail); on Mail it marks itself the current page.
	 *
	 * The strokes wear fixed identity inks (`--z-mark-*`), deliberately not
	 * channel hues. The mark never carries a count. Its geometry is mirrored in
	 * `static/favicon.svg` and `scripts/generate-icons.py`.
	 */
	interface Props {
		/** Where home is. */
		href?: string;
		/** Accessible name; away from home the tooltip adds the way back. */
		label?: string;
		/** Runs on click before navigation continues — a phone drawer closes itself. */
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
	onclick={() => onNavigate?.()}
	class="group flex shrink-0 items-center rounded-[9px] transition-transform duration-[80ms] select-none active:translate-y-[0.5px] {className}"
>
	<!-- The tile: a tactile button's body, because the mark is a button. -->
	<span
		class="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--z-line)] bg-[var(--z-surface)] shadow-[var(--z-shadow-tactile)] transition-[background-color,border-color] duration-[120ms] group-hover:border-[var(--z-faint)] group-hover:bg-[var(--z-hover)]"
		aria-hidden="true"
	>
		<svg class="size-4" viewBox="0 0 16 16" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
			<path stroke="var(--z-mark-z)" d="M3 3H13L3 13" />
			<path stroke="var(--z-mark-r)" d="M3 13H13" />
		</svg>
	</span>
</a>
