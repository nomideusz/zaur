<script lang="ts">
	import { page } from '$app/state';

	/**
	 * The brand mark and the shell's home button, as one lockup: the ZA/UR glyph
	 * — the same grid, round caps and 1.3 stroke as every other glyph in the
	 * shell — on a tactile tile the size of the header's buttons, beside the
	 * wordmark the login card wears. It does something when pressed now, so it
	 * wears the tactile shadow and the hover/press states the other controls
	 * wear, and reads as a control rather than a stamp sitting among them.
	 * Clicking goes home (Mail); on Mail it marks itself the current page.
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
	class="group flex shrink-0 items-center gap-2 rounded-[9px] transition-transform duration-[80ms] select-none active:translate-y-[0.5px] {className}"
>
	<!-- The tile: a tactile button's body, because the mark is a button now. -->
	<span
		class="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--z-line)] bg-[var(--z-surface)] shadow-[var(--z-shadow-tactile)] transition-[background-color,border-color] duration-[120ms] group-hover:border-[var(--z-faint)] group-hover:bg-[var(--z-hover)]"
		aria-hidden="true"
	>
		<svg class="size-4" viewBox="0 0 16 16" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
			<path stroke="var(--z-mark-z)" d="M2.5 2.5H6.5L2.5 6.5H6.5" />
			<path stroke="var(--z-mark-a)" d="M9.5 6.5L11.5 2.5L13.5 6.5M10.25 5H12.75" />
			<path stroke="var(--z-mark-a)" d="M2.5 9.5V11.6a2 1.9 0 0 0 4 0V9.5" />
			<path stroke="var(--z-mark-r)" d="M9.5 13.5V9.5H11.6a1.4 1.4 0 0 1 0 2.8H9.5M11.4 12.3L13.5 13.5" />
		</svg>
	</span>
	<!-- The wordmark, as on the login card; a phone header keeps only the tile. -->
	<span class="text-[14px] leading-none font-bold tracking-[-0.02em] text-[var(--z-ink)] max-md:hidden">Zaur</span>
</a>
