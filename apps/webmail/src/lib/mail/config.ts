export type SettingsNavSectionId = 'account' | 'mail' | 'general';

export type SettingsNavIcon = 'account' | 'mail' | 'general';

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
	{ id: 'account', label: 'Account' },
	{ id: 'mail', label: 'Mail' },
	{ id: 'general', label: 'General' }
];

export const SETTINGS_NAV_LINKS: SettingsNavLink[] = [
	{ href: '/settings/account', label: 'Account', icon: 'account', section: 'account' },
	{ href: '/settings/mail', label: 'Mail', icon: 'mail', section: 'mail' },
	{ href: '/settings/general', label: 'General', icon: 'general', section: 'general' }
];

/** Paths merged into consolidated settings pages — kept for redirects and search. */
export const LEGACY_SETTINGS_PATHS = new Set([
	'/settings/reading',
	'/settings/writing',
	'/settings/appearance',
	'/settings/data',
	'/settings/workspace',
	'/settings/display',
	'/settings/sidebar',
	'/settings/contacts',
	'/settings/inbox',
	'/settings/compose',
	'/settings/layout',
	'/settings/calendar'
]);

export function settingsNavLinks(): SettingsNavLink[] {
	return SETTINGS_NAV_LINKS;
}

export function isSettingsNavActive(pathname: string, href: string): boolean {
	if (pathname === href) return true;
	if (href === '/settings/mail') {
		return (
			pathname === '/settings/reading' ||
			pathname === '/settings/writing' ||
			pathname === '/settings/layout' ||
			pathname === '/settings/workspace' ||
			pathname === '/settings/sidebar' ||
			pathname === '/settings/inbox' ||
			pathname === '/settings/compose'
		);
	}
	if (href === '/settings/general') {
		return (
			pathname === '/settings/appearance' ||
			pathname === '/settings/data' ||
			pathname === '/settings/display'
		);
	}
	return false;
}

export function settingsRedirect(pathname: string): string | null {
	if (pathname === '/settings') return '/settings/account';
	if (pathname === '/settings/reading' || pathname === '/settings/writing') return '/settings/mail';
	if (pathname === '/settings/appearance' || pathname === '/settings/data') return '/settings/general';
	if (pathname === '/settings/mail') return null;
	if (pathname === '/settings/layout') return '/settings/mail';
	if (pathname === '/settings/workspace') return '/settings/mail';
	if (pathname === '/settings/sidebar') return '/settings/mail';
	if (pathname === '/settings/inbox') return '/settings/mail';
	if (pathname === '/settings/compose') return '/settings/mail';
	if (pathname === '/settings/display') return '/settings/general';
	if (pathname === '/settings/calendar') return '/calendar';
	return null;
}
