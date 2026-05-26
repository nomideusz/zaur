export type SettingsNavLink = {
	href: string;
	label: string;
	section?: 'personal' | 'mail' | 'customize' | 'advanced';
};

const ALL_LINKS: SettingsNavLink[] = [
	{ href: '/settings/account', label: 'You', section: 'personal' },
	{ href: '/settings/mail', label: 'General', section: 'mail' },
	{ href: '/settings/inbox', label: 'Inbox list', section: 'mail' },
	{ href: '/settings/reading', label: 'Reading', section: 'mail' },
	{ href: '/settings/appearance', label: 'Theme', section: 'customize' },
	{ href: '/settings/layout', label: 'Layout', section: 'customize' },
	{ href: '/settings/sidebar', label: 'Sidebar', section: 'customize' },
	{ href: '/settings/compose', label: 'Writing', section: 'customize' },
	{ href: '/settings/calendar', label: 'Calendar', section: 'customize' },
	{ href: '/settings/contacts', label: 'Contacts', section: 'advanced' },
	{ href: '/settings/data', label: 'Backup & reset', section: 'advanced' }
];

/** Paths merged into other settings pages — kept for redirects and search. */
export const LEGACY_SETTINGS_PATHS = new Set(['/settings/workspace', '/settings/display']);

export function settingsNavLinks(): SettingsNavLink[] {
	return ALL_LINKS;
}

export function isSettingsNavActive(pathname: string, href: string): boolean {
	if (pathname === href) return true;
	if (href === '/settings/layout') {
		return pathname === '/settings/workspace';
	}
	return false;
}
