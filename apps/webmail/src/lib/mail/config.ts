export type SettingsNavSectionId =
	| 'account'
	| 'security'
	| 'appearance'
	| 'reading'
	| 'writing'
	| 'calendar'
	| 'data'
	| 'shortcuts';

export type SettingsNavIcon = SettingsNavSectionId;

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

export function settingsNavLinks(viewport: SettingsNavViewport = 'all'): SettingsNavLink[] {
	return SETTINGS_NAV_LINKS.filter((link) => {
		if (viewport === 'mobile' && link.desktopOnly) return false;
		return true;
	});
}

// Legacy paths (/settings/mail, /settings/display, …) 307-redirect server-side,
// so the nav never sees them — plain equality is enough.
export function isSettingsNavActive(pathname: string, href: string): boolean {
	return pathname === href;
}
