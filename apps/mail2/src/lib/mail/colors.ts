/**
 * Anthony Hobday–inspired color palette:
 * Saturated, cheerful, high-contrast candy/pastel pairs with matching darker stroke borders.
 * Used for sender avatars, folder badges, calendar/event chips, and category checkboxes.
 */

export type HobdayThemeName = 'blue' | 'green' | 'pink' | 'amber' | 'purple';

export interface HobdayColorTheme {
	name: HobdayThemeName;
	bg: string;
	border: string;
	text: string;
	accent: string;
	checkboxBg: string;
	badgeBg: string;
	badgeBorder: string;
	badgeText: string;
}

export const HOBDAY_THEMES: Record<HobdayThemeName, HobdayColorTheme> = {
	blue: {
		name: 'blue',
		bg: '#dbeafe', // soft blue fill
		border: '#3b82f6', // crisp cobalt stroke
		text: '#1e40af', // high-contrast dark text
		accent: '#2563eb',
		checkboxBg: '#2563eb',
		badgeBg: '#e0f2fe',
		badgeBorder: '#38bdf8',
		badgeText: '#0369a1'
	},
	green: {
		name: 'green',
		bg: '#bbf7d0', // fresh mint/emerald fill
		border: '#16a34a', // crisp leaf green stroke
		text: '#14532d',
		accent: '#16a34a',
		checkboxBg: '#16a34a',
		badgeBg: '#dcfce7',
		badgeBorder: '#4ade80',
		badgeText: '#15803d'
	},
	pink: {
		name: 'pink',
		bg: '#fbcfe8', // bubblegum/fuchsia fill
		border: '#db2777', // crisp dark pink stroke
		text: '#831843',
		accent: '#db2777',
		checkboxBg: '#db2777',
		badgeBg: '#fce7f3',
		badgeBorder: '#f472b6',
		badgeText: '#be185d'
	},
	amber: {
		name: 'amber',
		bg: '#fde68a', // warm gold/amber fill
		border: '#d97706', // crisp amber stroke
		text: '#78350f',
		accent: '#d97706',
		checkboxBg: '#d97706',
		badgeBg: '#fef3c7',
		badgeBorder: '#fcd34d',
		badgeText: '#b45309'
	},
	purple: {
		name: 'purple',
		bg: '#ddd6fe', // lavender fill
		border: '#7c3aed', // crisp violet stroke
		text: '#4c1d95',
		accent: '#7c3aed',
		checkboxBg: '#7c3aed',
		badgeBg: '#ede9fe',
		badgeBorder: '#a78bfa',
		badgeText: '#6d28d9'
	}
};

const THEME_KEYS: HobdayThemeName[] = ['blue', 'green', 'pink', 'amber', 'purple'];

/**
 * Deterministically hash an email or name to one of the 5 Hobday themes.
 */
export function getHobdayTheme(seed: string): HobdayColorTheme {
	const str = (seed || '').trim().toLowerCase();
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	const index = Math.abs(hash) % THEME_KEYS.length;
	return HOBDAY_THEMES[THEME_KEYS[index]!];
}

/** No file type maps to red in the five themes, and a PDF has always been red. */
const PDF_BADGE = { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' };

/**
 * The kind badge on an attachment chip — the same colours in the reader and in
 * a compose draft, so a file looks the same before and after it is sent.
 */
export function attachmentBadge(type: string): { bg: string; border: string; text: string } {
	const mime = (type || '').toLowerCase();
	const theme =
		mime.includes('image')
			? HOBDAY_THEMES.blue
			: mime.includes('zip') || mime.includes('archive')
				? HOBDAY_THEMES.amber
				: HOBDAY_THEMES.green;
	if (mime.includes('pdf')) return PDF_BADGE;
	return { bg: theme.badgeBg, border: theme.badgeBorder, text: theme.badgeText };
}
