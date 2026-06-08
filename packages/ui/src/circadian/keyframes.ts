/**
 * Solar-day keyframes for Zaur's warm stone palette.
 * Values are HSL (h s% l%) — accent stays fixed in circadian.css.
 *
 * Hour map (local time):
 *   0–5   night → dawn
 *   6–7   dawn
 *   8–16  day (matches current :root light tokens)
 *   17–20 dusk
 *   21–23 evening → night
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
		surface: { h: 40, s: 4, l: 6 },
		fg: { h: 40, s: 5, l: 93 }
	},
	{
		hour: 6,
		label: 'dawn',
		surface: { h: 48, s: 16, l: 97 },
		fg: { h: 210, s: 10, l: 12 }
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
		hour: 18,
		label: 'dusk',
		surface: { h: 38, s: 14, l: 93 },
		fg: { h: 35, s: 8, l: 13 }
	},
	{
		hour: 21,
		label: 'evening',
		surface: { h: 35, s: 8, l: 14 },
		fg: { h: 40, s: 7, l: 91 }
	},
	{
		hour: 24,
		label: 'midnight',
		surface: { h: 40, s: 4, l: 6 },
		fg: { h: 40, s: 5, l: 93 }
	}
] as const;
