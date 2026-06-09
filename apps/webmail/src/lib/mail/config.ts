export type SettingsNavSectionId = 'account' | 'reading' | 'writing' | 'shortcuts';

export type SettingsNavIcon = 'account' | 'reading' | 'writing' | 'shortcuts';

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
	{ id: 'reading', label: 'Reading' },
	{ id: 'writing', label: 'Writing' },
	{ id: 'shortcuts', label: 'Shortcuts' }
];

export const SETTINGS_NAV_LINKS: SettingsNavLink[] = [
	{ href: '/settings/account', label: 'Account', icon: 'account', section: 'account' },
	{ href: '/settings/reading', label: 'Reading', icon: 'reading', section: 'reading' },
	{ href: '/settings/compose', label: 'Writing', icon: 'writing', section: 'writing' },
	{ href: '/settings/shortcuts', label: 'Shortcuts', icon: 'shortcuts', section: 'shortcuts', desktopOnly: true }
];

export type SettingsNavViewport = 'all' | 'mobile' | 'desktop';

/** Paths merged into consolidated settings pages — kept for redirects and search. */
export const LEGACY_SETTINGS_PATHS = new Set([
	'/settings/mail',
	'/settings/writing',
	'/settings/appearance',
	'/settings/data',
	'/settings/general',
	'/settings/workspace',
	'/settings/display',
	'/settings/sidebar',
	'/settings/contacts',
	'/settings/layout',
	'/settings/calendar'
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
		return (
			pathname === '/settings/appearance' ||
			pathname === '/settings/data' ||
			pathname === '/settings/display' ||
			pathname === '/settings/general'
		);
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
	if (pathname === '/settings/appearance' || pathname === '/settings/data') return '/settings/account';
	if (pathname === '/settings/general') return '/settings/account';
	if (pathname === '/settings/layout') return '/settings/reading';
	if (pathname === '/settings/inbox') return '/settings/reading';
	if (pathname === '/settings/workspace') return '/settings/reading';
	if (pathname === '/settings/sidebar') return '/settings/reading';
	if (pathname === '/settings/contacts') return '/settings/account';
	if (pathname === '/settings/display') return '/settings/account';
	if (pathname === '/settings/calendar') return '/calendar';
	return null;
}
