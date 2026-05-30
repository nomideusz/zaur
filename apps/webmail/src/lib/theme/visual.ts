export type AccentColor = 'charcoal' | 'blue' | 'teal' | 'violet' | 'slate';

export const ACCENT_OPTIONS: ReadonlyArray<{
	id: AccentColor;
	label: string;
	swatch: string;
}> = [
	{ id: 'charcoal', label: 'Charcoal', swatch: '#2f3437' },
	{ id: 'blue', label: 'Blue', swatch: '#2563eb' },
	{ id: 'teal', label: 'Teal', swatch: '#0d9488' },
	{ id: 'violet', label: 'Violet', swatch: '#7c3aed' },
	{ id: 'slate', label: 'Slate', swatch: '#475569' }
];

const STORAGE = {
	accentColor: 'zaur:accent-color'
} as const;

export function readAccentColor(): AccentColor {
	if (typeof localStorage === 'undefined') return 'charcoal';
	const value = localStorage.getItem(STORAGE.accentColor);
	return value === 'charcoal' || value === 'blue' || value === 'teal' || value === 'violet' || value === 'slate' ? value : 'charcoal';
}

export function applyVisualPreferences(
	root: HTMLElement,
	prefs: { accentColor: AccentColor }
) {
	root.dataset.accent = prefs.accentColor;
}

export { STORAGE as VISUAL_STORAGE };
