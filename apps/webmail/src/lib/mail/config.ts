export type SettingsNavSectionId =
	| 'account'
	| 'reading'
	| 'writing'
	| 'appearance'
	| 'data';

export type SettingsNavIcon =
	| 'account'
	| 'reading'
	| 'writing'
	| 'appearance'
	| 'data';

export type SettingsNavLink = {
	href: string;
	label: string;
	icon: SettingsNavIcon;
	section: SettingsNavSectionId;
};

/** Editorial mail + settings layout constants. */
export const MAIL_LAYOUT = {
	mailRootClass: 'z-mail-view',
	settingsRootClass: 'z-settings-view',
	mail: {
		useFullscreenMobileReader: true
	}
} as const;

export const SETTINGS_SECTIONS: { id: SettingsNavSectionId; label: string }[] = [
	{ id: 'account', label: '' },
	{ id: 'reading', label: '' },
	{ id: 'writing', label: '' },
	{ id: 'appearance', label: '' },
	{ id: 'data', label: '' }
];

export const SETTINGS_NAV_LINKS: SettingsNavLink[] = [
	{ href: '/settings/account', label: 'Account', icon: 'account', section: 'account' },
	{ href: '/settings/reading', label: 'Reading', icon: 'reading', section: 'reading' },
	{ href: '/settings/writing', label: 'Writing', icon: 'writing', section: 'writing' },
	{ href: '/settings/appearance', label: 'Appearance', icon: 'appearance', section: 'appearance' },
	{ href: '/settings/data', label: 'Data', icon: 'data', section: 'data' }
];

/** Paths merged into other settings pages — kept for redirects and search. */
export const LEGACY_SETTINGS_PATHS = new Set([
	'/settings/workspace',
	'/settings/display',
	'/settings/sidebar',
	'/settings/contacts',
	'/settings/inbox',
	'/settings/compose',
	'/settings/layout',
	'/settings/calendar',
	'/settings/mail'
]);

export function settingsNavLinks(): SettingsNavLink[] {
	return SETTINGS_NAV_LINKS;
}

export function isSettingsNavActive(pathname: string, href: string): boolean {
	if (pathname === href) return true;
	if (href === '/settings/reading') {
		return (
			pathname === '/settings/layout' ||
			pathname === '/settings/workspace' ||
			pathname === '/settings/sidebar' ||
			pathname === '/settings/inbox' ||
			pathname === '/settings/mail'
		);
	}
	if (href === '/settings/writing') {
		return pathname === '/settings/compose';
	}
	return false;
}

export function settingsRedirect(pathname: string): string | null {
	if (pathname === '/settings') return '/settings/account';
	if (pathname === '/settings/mail') return '/settings/reading';
	if (pathname === '/settings/layout') return '/settings/reading';
	if (pathname === '/settings/workspace') return '/settings/reading';
	if (pathname === '/settings/sidebar') return '/settings/reading';
	if (pathname === '/settings/inbox') return '/settings/reading';
	if (pathname === '/settings/compose') return '/settings/writing';
	if (pathname === '/settings/calendar') return '/calendar';
	return null;
}
