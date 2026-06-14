/** Ink on highlighted Important subjects — always dark (Ori `text-black` pattern). */
export const IMPORTANT_MARKER_TEXT = '#1a1d1f';

/**
 * Highlighter stroke for rough-notation — light pastels so dark ink stays readable.
 * Purple/violet hues need extra lightness: stacked strokes read darker than the CSS color.
 */
export function markerHighlightColor(hue: number): string {
	const h = ((hue % 360) + 360) % 360;
	let saturation = 80;
	let lightness = 80;

	if (h >= 245 && h <= 295) {
		// Purple/violet stack darker — lift lightness, ease saturation a touch.
		saturation = 68;
		lightness = 84;
	} else if (h >= 200 && h < 245) {
		saturation = 74;
		lightness = 82;
	} else if (h >= 45 && h <= 75) {
		// Yellow/lime turn muddy when too dark — keep them bright.
		saturation = 84;
		lightness = 82;
	}

	return `hsla(${h}, ${saturation}%, ${lightness}%, 0.9)`;
}
