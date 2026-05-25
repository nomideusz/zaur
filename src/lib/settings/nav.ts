import type { SettingsDetailLevel } from './detail-level';
import { ADVANCED_ONLY_SETTINGS_PATHS } from './detail-level';

export type SettingsNavLink = {
	href: string;
	label: string;
	hint: string;
	section?: 'personal' | 'mail' | 'customize' | 'advanced';
};

const ALL_LINKS: SettingsNavLink[] = [
	{ href: '/settings/account', label: 'You', hint: 'Name, signature, sign out', section: 'personal' },
	{ href: '/settings/mail', label: 'Mail', hint: 'Notifications and shortcuts', section: 'mail' },
	{
		href: '/settings/appearance',
		label: 'Look & feel',
		hint: 'Theme and motion',
		section: 'customize'
	},
	{ href: '/settings/inbox', label: 'Inbox', hint: 'Message list layout', section: 'customize' },
	{
		href: '/settings/reading',
		label: 'Reading',
		hint: 'Open messages and threads',
		section: 'customize'
	},
	{ href: '/settings/compose', label: 'Writing', hint: 'Compose and replies', section: 'customize' },
	{
		href: '/settings/workspace',
		label: 'Workspace',
		hint: 'Layout, folders, navigation',
		section: 'customize'
	},
	{
		href: '/settings/contacts',
		label: 'Contacts',
		hint: 'Contacts page tweaks',
		section: 'advanced'
	},
	{
		href: '/settings/data',
		label: 'Backup & reset',
		hint: 'Export, import, defaults',
		section: 'advanced'
	}
];

export function settingsNavLinks(level: SettingsDetailLevel): SettingsNavLink[] {
	if (level === 'advanced') return ALL_LINKS;
	return ALL_LINKS.filter((link) => !ADVANCED_ONLY_SETTINGS_PATHS.has(link.href));
}

export function isSettingsNavActive(pathname: string, href: string): boolean {
	return pathname === href || (href === '/settings/appearance' && pathname === '/settings/display');
}
