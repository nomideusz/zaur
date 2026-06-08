/** Ink on highlighted Important subjects — always dark (Ori `text-black` pattern). */
export const IMPORTANT_MARKER_TEXT = '#1a1d1f';

/**
 * Opaque marker stroke — vivid on dark UI, pairs with dark text for WCAG contrast.
 */
export function markerHighlightColor(hue: number): string {
	const h = ((hue % 360) + 360) % 360;
	// Keep lightness in a band where #1a1d1f stays readable on every hue.
	return `hsla(${h}, 78%, 66%, 0.92)`;
}
