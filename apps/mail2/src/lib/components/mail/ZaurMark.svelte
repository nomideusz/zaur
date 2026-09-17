<script lang="ts">
	/**
	 * The brand mark: ZA/UR drawn as a 16px icon — the same grid, round caps and
	 * near-1.3 stroke as every other glyph in the shell — in a 32px tile the size
	 * of the header's tactile buttons, without their shadow because it does
	 * nothing when pressed. It sits among the icons rather than above them.
	 *
	 * The strokes wear fixed identity inks (`--z-mark-*`), deliberately not
	 * channel hues. The mark never carries a count. Its geometry is mirrored in
	 * `static/favicon.svg` and `scripts/generate-icons.py`.
	 */
	interface Props {
		/** Tooltip; the mark also announces it to screen readers. */
		label?: string;
		/** Extra classes — e.g. to lift the mark out of a header's flow. */
		class?: string;
	}

	let { label = 'Zaur', class: className = '' }: Props = $props();
</script>

<span
	role="img"
	aria-label={label}
	title={label}
	class="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--z-line)] bg-[var(--z-surface)] select-none {className}"
>
	<svg class="size-4" viewBox="0 0 16 16" fill="none" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path stroke="var(--z-mark-z)" d="M2.5 2.5H6.5L2.5 6.5H6.5" />
		<path stroke="var(--z-mark-a)" d="M9.5 6.5L11.5 2.5L13.5 6.5M10.25 5H12.75" />
		<path stroke="var(--z-mark-a)" d="M2.5 9.5V11.6a2 1.9 0 0 0 4 0V9.5" />
		<path stroke="var(--z-mark-r)" d="M9.5 13.5V9.5H11.6a1.4 1.4 0 0 1 0 2.8H9.5M11.4 12.3L13.5 13.5" />
	</svg>
</span>
