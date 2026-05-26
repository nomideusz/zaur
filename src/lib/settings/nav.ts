export type SettingsNavIcon =
	| 'account'
	| 'general'
	| 'inbox'
	| 'reading'
	| 'writing'
	| 'appearance'
	| 'layout'
	| 'calendar'
	| 'backup';

export type SettingsNavLink = {
	href: string;
	label: string;
	icon: SettingsNavIcon;
	section?: 'personal' | 'mail' | 'customize' | 'advanced';
};

const ALL_LINKS: SettingsNavLink[] = [
	{ href: '/settings/account', label: 'Account', icon: 'account', section: 'personal' },
	{ href: '/settings/mail', label: 'General', icon: 'general', section: 'mail' },
	{ href: '/settings/inbox', label: 'Inbox', icon: 'inbox', section: 'mail' },
	{ href: '/settings/reading', label: 'Reading', icon: 'reading', section: 'mail' },
	{ href: '/settings/compose', label: 'Writing', icon: 'writing', section: 'mail' },
	{ href: '/settings/appearance', label: 'Appearance', icon: 'appearance', section: 'customize' },
	{ href: '/settings/layout', label: 'Layout', icon: 'layout', section: 'customize' },
	{ href: '/settings/calendar', label: 'Calendar', icon: 'calendar', section: 'customize' },
	{ href: '/settings/data', label: 'Backup & reset', icon: 'backup', section: 'advanced' }
];

/** Paths merged into other settings pages — kept for redirects and search. */
export const LEGACY_SETTINGS_PATHS = new Set([
	'/settings/workspace',
	'/settings/display',
	'/settings/sidebar',
	'/settings/contacts'
]);

export const SETTINGS_SECTIONS = [
	{ id: 'personal', label: 'Account' },
	{ id: 'mail', label: 'Mail' },
	{ id: 'customize', label: 'Interface' },
	{ id: 'advanced', label: 'More' }
] as const;

export function settingsNavLinks(): SettingsNavLink[] {
	return ALL_LINKS;
}

export function isSettingsNavActive(pathname: string, href: string): boolean {
	if (pathname === href) return true;
	if (href === '/settings/layout') {
		return pathname === '/settings/workspace' || pathname === '/settings/sidebar';
	}
	return false;
}
