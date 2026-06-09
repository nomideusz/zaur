/**
 * Solar-day keyframes for Zaur's warm stone palette.
 * Values are HSL (h s% l%) — accent stays fixed in circadian.css.
 *
 * Surface drives the look; foreground lightness is contrast-guarded at sample
 * time (see interpolate.ts), so these fg values are the *targets* at the stable
 * day/night extremes — the guard keeps text readable through the transitions.
 *
 * The dawn (≈5.5→7h) and dusk (≈19.5→21h) ramps are intentionally steep so the
 * background spends as little time as possible at washed-out mid lightness.
 *
 * Hour map (local time):
 *   0–5.5   night (held dark)
 *   5.5–7   sunrise ramp
 *   7–17    day (matches current :root light tokens)
 *   17–19.5 early evening (held light)
 *   19.5–21 sunset ramp
 *   21–24   night
 */

export type CircadianKeyframe = {
	/** Local hour [0, 24). */
	hour: number;
	label: string;
	surface: { h: number; s: number; l: number };
	fg: { h: number; s: number; l: number };
};

export const CIRCADIAN_KEYFRAMES: readonly CircadianKeyframe[] = [
	{
		hour: 0,
		label: 'midnight',
		surface: { h: 40, s: 5, l: 10 },
		fg: { h: 40, s: 8, l: 93 }
	},
	{
		hour: 5.5,
		label: 'night',
		// Hold dark through the small hours so dawn can ramp quickly.
		surface: { h: 40, s: 6, l: 10 },
		fg: { h: 40, s: 8, l: 93 }
	},
	{
		hour: 7,
		label: 'dawn',
		surface: { h: 44, s: 16, l: 96 },
		fg: { h: 215, s: 11, l: 13 }
	},
	{
		hour: 9,
		label: 'morning',
		surface: { h: 42, s: 11, l: 98 },
		fg: { h: 210, s: 10, l: 11 }
	},
	{
		hour: 13,
		label: 'day',
		// Matches packages/ui/src/theme.css :root light
		surface: { h: 60, s: 11, l: 98 },
		fg: { h: 210, s: 10, l: 11 }
	},
	{
		hour: 17,
		label: 'afternoon',
		surface: { h: 40, s: 13, l: 96 },
		fg: { h: 30, s: 9, l: 12 }
	},
	{
		hour: 19.5,
		label: 'dusk',
		// Still clearly light — last keyframe before the fast sunset.
		surface: { h: 34, s: 12, l: 90 },
		fg: { h: 30, s: 9, l: 14 }
	},
	{
		hour: 21,
		label: 'evening',
		surface: { h: 34, s: 9, l: 10 },
		fg: { h: 40, s: 8, l: 93 }
	},
	{
		hour: 24,
		label: 'midnight',
		surface: { h: 40, s: 5, l: 10 },
		fg: { h: 40, s: 8, l: 93 }
	}
] as const;
