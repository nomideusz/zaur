export type SettingsNavSectionId =
	| 'account'
	| 'security'
	| 'appearance'
	| 'reading'
	| 'writing'
	| 'calendar'
	| 'data'
	| 'shortcuts';

export type SettingsNavIcon =
	| 'account'
	| 'security'
	| 'appearance'
	| 'reading'
	| 'writing'
	| 'calendar'
	| 'data'
	| 'shortcuts';

export type SettingsNavLink = {
	href: string;
	label: string;
	icon: SettingsNavIcon;
	section: SettingsNavSectionId;
	/** Hidden from mobile settings nav — desktop keyboard workflows only. */
	desktopOnly?: boolean;
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
	{ id: 'account', label: 'Account' },
	{ id: 'security', label: 'Security' },
	{ id: 'appearance', label: 'Appearance' },
	{ id: 'reading', label: 'Reading' },
	{ id: 'writing', label: 'Writing' },
	{ id: 'calendar', label: 'Calendar' },
	{ id: 'data', label: 'Data' },
	{ id: 'shortcuts', label: 'Shortcuts' }
];

export const SETTINGS_NAV_LINKS: SettingsNavLink[] = [
	{ href: '/settings/account', label: 'Account', icon: 'account', section: 'account' },
	{ href: '/settings/security', label: 'Security', icon: 'security', section: 'security' },
	{ href: '/settings/appearance', label: 'Appearance', icon: 'appearance', section: 'appearance' },
	{ href: '/settings/reading', label: 'Reading', icon: 'reading', section: 'reading' },
	{ href: '/settings/compose', label: 'Writing', icon: 'writing', section: 'writing' },
	{ href: '/settings/calendar', label: 'Calendar', icon: 'calendar', section: 'calendar' },
	{ href: '/settings/data', label: 'Data', icon: 'data', section: 'data' },
	{ href: '/settings/shortcuts', label: 'Shortcuts', icon: 'shortcuts', section: 'shortcuts', desktopOnly: true }
];

export type SettingsNavViewport = 'all' | 'mobile' | 'desktop';

/** Paths merged into consolidated settings pages — kept for redirects and search. */
export const LEGACY_SETTINGS_PATHS = new Set([
	'/settings/mail',
	'/settings/writing',
	'/settings/general',
	'/settings/workspace',
	'/settings/display',
	'/settings/sidebar',
	'/settings/contacts',
	'/settings/layout'
]);

export function settingsNavLinks(viewport: SettingsNavViewport = 'all'): SettingsNavLink[] {
	return SETTINGS_NAV_LINKS.filter((link) => {
		if (viewport === 'mobile' && link.desktopOnly) return false;
		return true;
	});
}

export function isSettingsNavActive(pathname: string, href: string): boolean {
	if (pathname === href) return true;
	if (href === '/settings/account') {
		return pathname === '/settings/display' || pathname === '/settings/general';
	}
	if (href === '/settings/reading') {
		return pathname === '/settings/mail' || pathname === '/settings/layout';
	}
	if (href === '/settings/compose') {
		return pathname === '/settings/writing';
	}
	return false;
}

export function settingsRedirect(pathname: string): string | null {
	if (pathname === '/settings') return '/settings/account';
	if (pathname === '/settings/mail') return '/settings/reading';
	if (pathname === '/settings/writing') return '/settings/compose';
	if (pathname === '/settings/general') return '/settings/account';
	if (pathname === '/settings/layout') return '/settings/reading';
	if (pathname === '/settings/inbox') return '/settings/reading';
	if (pathname === '/settings/workspace') return '/settings/reading';
	if (pathname === '/settings/sidebar') return '/settings/reading';
	if (pathname === '/settings/contacts') return '/settings/account';
	if (pathname === '/settings/display') return '/settings/account';
	return null;
}
