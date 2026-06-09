import { CIRCADIAN_KEYFRAMES, type CircadianKeyframe } from './keyframes.js';

export type CircadianSample = {
	/** 0–1 position through the local day. */
	t: number;
	/** Nearest keyframe label (for debugging). */
	phase: string;
	surface: { h: number; s: number; l: number };
	fg: { h: number; s: number; l: number };
};

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function lerpHue(a: number, b: number, t: number): number {
	const delta = ((b - a + 540) % 360) - 180;
	return (a + delta * t + 360) % 360;
}

function lerpTriple(
	from: CircadianKeyframe['surface'],
	to: CircadianKeyframe['surface'],
	t: number
): CircadianKeyframe['surface'] {
	return {
		h: lerpHue(from.h, to.h, t),
		s: lerp(from.s, to.s, t),
		l: lerp(from.l, to.l, t)
	};
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/** Lightness below which the surface is treated as dark (light text wins). */
const DARK_SURFACE_L = 50;
/** Minimum lightness gap kept between surface and foreground (readability floor). */
const MIN_CONTRAST_L = 62;

/**
 * Force the foreground to stay readable against the surface.
 *
 * The raw keyframe interpolation cross-fades surface AND foreground lightness
 * through mid-gray at the same time during dawn/dusk, collapsing contrast. By
 * pinning fg lightness to the high-contrast side of the surface we guarantee
 * legible text at every minute of the day. At the stable extremes this is a
 * no-op; it only bites near the transitions.
 */
function guardContrast(
	surface: CircadianKeyframe['surface'],
	fg: CircadianKeyframe['surface']
): CircadianKeyframe['surface'] {
	if (surface.l < DARK_SURFACE_L) {
		// Dark surface → light text.
		return { ...fg, l: clamp(Math.max(fg.l, surface.l + MIN_CONTRAST_L), 0, 100) };
	}
	// Light surface → dark text.
	return { ...fg, l: clamp(Math.min(fg.l, surface.l - MIN_CONTRAST_L), 0, 100) };
}

/** Fraction of the local day elapsed [0, 1). */
export function dayFraction(date = new Date()): number {
	const h = date.getHours();
	const m = date.getMinutes();
	const s = date.getSeconds();
	return (h * 3600 + m * 60 + s) / 86400;
}

export function sampleCircadian(date = new Date()): CircadianSample {
	const t = dayFraction(date);
	const hour = t * 24;
	const frames = CIRCADIAN_KEYFRAMES;

	let from = frames[0];
	let to = frames[1];
	for (let i = 0; i < frames.length - 1; i++) {
		if (hour >= frames[i].hour && hour < frames[i + 1].hour) {
			from = frames[i];
			to = frames[i + 1];
			break;
		}
	}

	const span = to.hour - from.hour;
	const localT = span > 0 ? (hour - from.hour) / span : 0;

	const surface = lerpTriple(from.surface, to.surface, localT);
	const fg = guardContrast(surface, lerpTriple(from.fg, to.fg, localT));

	return {
		t,
		phase: localT < 0.5 ? from.label : to.label,
		surface,
		fg
	};
}

/** True when surfaces are dark enough for dark color-scheme semantics. */
export function isCircadianDark(sample: CircadianSample): boolean {
	return sample.surface.l < DARK_SURFACE_L;
}
