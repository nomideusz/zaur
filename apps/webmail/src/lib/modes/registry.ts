import type { SettingsNavLink, SettingsNavSectionId, WebmailModeDefinition } from './types';

/** Single webmail layout — editorial Simple mode. */
export const WEBMAIL_MODE: WebmailModeDefinition = {
	id: 'simple',
	label: 'Simple',
	tagline: 'Editorial, one-column reading',
	description:
		'Content-first mail inspired by editorial sites. Text navigation, sectioned inbox, adaptive reading focus — no sidebars or dense chrome.',
	mailRootClass: 'z-mail-view-simple',
	settingsRootClass: 'z-settings-mode-simple',
	settings: {
		useSidebar: false,
		showAppHeader: false,
		editorial: true
	},
	mail: {
		showAppHeaderOnMailRoutes: false,
		showMailboxSidebar: false,
		showEmptyReaderPane: false,
		useSectionedMessageList: true,
		useExpandedMessageList: true,
		useClassicSplitPanes: false,
		useAdaptiveReaderFocus: true,
		useFullscreenMobileReader: true
	}
};

export const SETTINGS_SECTIONS: { id: SettingsNavSectionId; label: string }[] = [
	{ id: 'experience', label: 'Mode' },
	{ id: 'account', label: '' },
	{ id: 'appearance', label: '' },
	{ id: 'reading', label: '' },
	{ id: 'writing', label: '' },
	{ id: 'backup', label: '' }
];

export const SETTINGS_NAV_LINKS: SettingsNavLink[] = [
	{ href: '/settings/account', label: 'Account', icon: 'account', section: 'account' },
	{ href: '/settings/appearance', label: 'Appearance', icon: 'appearance', section: 'appearance' },
	{ href: '/settings/reading', label: 'Reading', icon: 'reading', section: 'reading' },
	{ href: '/settings/writing', label: 'Writing', icon: 'writing', section: 'writing' },
	{ href: '/settings/data', label: 'Backup & reset', icon: 'backup', section: 'backup' }
];

/** Paths merged into other settings pages — kept for redirects and search. */
export const LEGACY_SETTINGS_PATHS = new Set([
	'/settings/mail',
	'/settings/workspace',
	'/settings/display',
	'/settings/sidebar',
	'/settings/contacts',
	'/settings/inbox',
	'/settings/compose',
	'/settings/layout',
	'/settings/calendar'
]);

export function webmailModeDefinition(): WebmailModeDefinition {
	return WEBMAIL_MODE;
}

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
			pathname === '/settings/mail' ||
			pathname === '/settings/inbox'
		);
	}
	if (href === '/settings/writing') {
		return pathname === '/settings/compose';
	}
	return false;
}

export function settingsRedirectForMode(pathname: string): string | null {
	if (pathname === '/settings') return '/settings/account';
	if (pathname === '/settings/layout') return '/settings/reading';
	if (pathname === '/settings/workspace') return '/settings/reading';
	if (pathname === '/settings/sidebar') return '/settings/reading';
	if (pathname === '/settings/mail') return '/settings/reading';
	if (pathname === '/settings/inbox') return '/settings/reading';
	if (pathname === '/settings/compose') return '/settings/writing';
	return null;
}
