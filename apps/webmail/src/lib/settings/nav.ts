import type { MailViewMode } from '$lib/mail/view-mode';
import { webmailModeDefinition } from '$lib/modes/registry';

export type SettingsNavIcon =
	| 'mode'
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
	section?: SettingsNavSectionId;
};

export type SettingsNavSectionId = 'experience' | 'personal' | 'mail' | 'customize' | 'advanced';

const EXPERIENCE_LINK: SettingsNavLink = {
	href: '/settings',
	label: 'Experience',
	icon: 'mode',
	section: 'experience'
};

const COMMON_LINKS: SettingsNavLink[] = [
	{ href: '/settings/account', label: 'Account', icon: 'account', section: 'personal' },
	{ href: '/settings/mail', label: 'Mail settings', icon: 'general', section: 'mail' },
	{ href: '/settings/appearance', label: 'Appearance', icon: 'appearance', section: 'customize' },
	{ href: '/settings/calendar', label: 'Calendar', icon: 'calendar', section: 'customize' },
	{ href: '/settings/data', label: 'Backup & reset', icon: 'backup', section: 'advanced' }
];

/** Paths merged into other settings pages — kept for redirects and search. */
export const LEGACY_SETTINGS_PATHS = new Set([
	'/settings/workspace',
	'/settings/display',
	'/settings/sidebar',
	'/settings/contacts',
	'/settings/inbox',
	'/settings/reading',
	'/settings/compose'
]);

export const SETTINGS_SECTIONS = [
	{ id: 'experience', label: 'Mode' },
	{ id: 'personal', label: 'Account' },
	{ id: 'mail', label: 'Mail' },
	{ id: 'customize', label: 'Interface' },
	{ id: 'advanced', label: 'More' }
] as const;

export function settingsNavLinks(mode: MailViewMode = 'simple'): SettingsNavLink[] {
	return [
		EXPERIENCE_LINK,
		COMMON_LINKS[0],
		{
			href: '/settings/layout',
			label: webmailModeDefinition(mode).settingsViewLabel,
			icon: 'layout',
			section: 'mail'
		},
		...COMMON_LINKS.slice(1)
	];
}

export function isSettingsNavActive(pathname: string, href: string): boolean {
	if (pathname === href) return true;
	if (href === '/settings/layout') {
		return pathname === '/settings/workspace' || pathname === '/settings/sidebar';
	}
	return false;
}
