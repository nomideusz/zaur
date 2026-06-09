/** Ink on highlighted Important subjects — always dark (Ori `text-black` pattern). */
export const IMPORTANT_MARKER_TEXT = '#1a1d1f';

/**
 * Highlighter stroke for rough-notation — light pastels so dark ink stays readable.
 * Purple/violet hues need extra lightness: stacked strokes read darker than the CSS color.
 */
export function markerHighlightColor(hue: number): string {
	const h = ((hue % 360) + 360) % 360;
	let saturation = 56;
	let lightness = 85;

	if (h >= 245 && h <= 295) {
		saturation = 46;
		lightness = 88;
	} else if (h >= 200 && h < 245) {
		saturation = 50;
		lightness = 87;
	} else if (h >= 45 && h <= 75) {
		saturation = 52;
		lightness = 86;
	}

	return `hsla(${h}, ${saturation}%, ${lightness}%, 0.78)`;
}
