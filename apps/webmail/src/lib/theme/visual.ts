export type AccentColor = 'charcoal' | 'blue' | 'teal' | 'violet' | 'slate';
export type CornerStyle = 'default' | 'soft' | 'sharp';
export type SurfaceStyle = 'default' | 'soft';

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

export const CORNER_OPTIONS: ReadonlyArray<{ id: CornerStyle; label: string }> = [
	{ id: 'default', label: 'Default' },
	{ id: 'soft', label: 'Soft' },
	{ id: 'sharp', label: 'Sharp' }
];

export const SURFACE_OPTIONS: ReadonlyArray<{ id: SurfaceStyle; label: string }> = [
	{ id: 'default', label: 'Default' },
	{ id: 'soft', label: 'Soft' }
];

const STORAGE = {
	accentColor: 'zaur:accent-color',
	cornerStyle: 'zaur:corner-style',
	surfaceStyle: 'zaur:surface-style'
} as const;

export function readAccentColor(): AccentColor {
	if (typeof localStorage === 'undefined') return 'charcoal';
	const value = localStorage.getItem(STORAGE.accentColor);
	return value === 'charcoal' || value === 'blue' || value === 'teal' || value === 'violet' || value === 'slate' ? value : 'charcoal';
}

export function readCornerStyle(): CornerStyle {
	if (typeof localStorage === 'undefined') return 'default';
	const value = localStorage.getItem(STORAGE.cornerStyle);
	return value === 'soft' || value === 'sharp' ? value : 'default';
}

export function readSurfaceStyle(): SurfaceStyle {
	if (typeof localStorage === 'undefined') return 'default';
	return localStorage.getItem(STORAGE.surfaceStyle) === 'soft' ? 'soft' : 'default';
}

export function applyVisualPreferences(
	root: HTMLElement,
	prefs: { accentColor: AccentColor; cornerStyle: CornerStyle; surfaceStyle: SurfaceStyle }
) {
	root.dataset.accent = prefs.accentColor;
	root.dataset.corners = prefs.cornerStyle;
	root.dataset.surface = prefs.surfaceStyle;
}

export { STORAGE as VISUAL_STORAGE };
