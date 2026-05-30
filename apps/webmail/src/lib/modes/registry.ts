import type { MailViewMode } from '$lib/mail/view-mode';
import type { SettingsNavLink, SettingsNavSectionId, WebmailModeDefinition } from './types';

export const WEBMAIL_MODES: Record<MailViewMode, WebmailModeDefinition> = {
	simple: {
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
	},
	traditional: {
		id: 'traditional',
		label: 'Classic',
		tagline: 'Utility-dense three-pane mail',
		description:
			'Traditional desktop mail inspired by utility-first layouts. Folder sidebar, fixed list column, split panes, and square functional chrome.',
		mailRootClass: 'z-mail-view-traditional',
		settingsRootClass: 'z-settings-mode-classic',
		settings: {
			useSidebar: true,
			showAppHeader: true,
			editorial: false
		},
		mail: {
			showAppHeaderOnMailRoutes: true,
			showMailboxSidebar: true,
			showEmptyReaderPane: true,
			useSectionedMessageList: false,
			useExpandedMessageList: false,
			useClassicSplitPanes: true,
			useAdaptiveReaderFocus: false,
			useFullscreenMobileReader: false
		}
	}
};

export const WEBMAIL_MODE_LIST: WebmailModeDefinition[] = Object.values(WEBMAIL_MODES);

export const SETTINGS_SECTIONS: { id: SettingsNavSectionId; label: string }[] = [
	{ id: 'experience', label: 'Mode' },
	{ id: 'account', label: '' },
	{ id: 'appearance', label: '' },
	{ id: 'reading', label: '' },
	{ id: 'writing', label: '' },
	{ id: 'backup', label: '' }
];

export const SETTINGS_NAV_LINKS: SettingsNavLink[] = [
	{ href: '/settings', label: 'Experience', icon: 'mode', section: 'experience' },
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

export function webmailModeDefinition(mode: MailViewMode): WebmailModeDefinition {
	return WEBMAIL_MODES[mode];
}

export function settingsNavLinks(_mode: MailViewMode = 'simple'): SettingsNavLink[] {
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

export function settingsPathAllowedForMode(_pathname: string, _mode: MailViewMode): boolean {
	return true;
}

export function settingsRedirectForMode(pathname: string, _mode: MailViewMode): string | null {
	if (pathname === '/settings/layout') return '/settings/reading';
	if (pathname === '/settings/workspace') return '/settings/reading';
	if (pathname === '/settings/sidebar') return '/settings/reading';
	if (pathname === '/settings/mail') return '/settings/reading';
	if (pathname === '/settings/inbox') return '/settings/reading';
	if (pathname === '/settings/compose') return '/settings/writing';
	return null;
}
