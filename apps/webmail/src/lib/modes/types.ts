import type { MailViewMode } from '$lib/mail/view-mode';

export type WebmailMode = MailViewMode;

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

export type SettingsNavSectionId =
	| 'experience'
	| 'account'
	| 'appearance'
	| 'reading'
	| 'writing'
	| 'backup';

export type SettingsNavLink = {
	href: string;
	label: string;
	icon: SettingsNavIcon;
	section: SettingsNavSectionId;
};

export type WebmailModeDefinition = {
	id: WebmailMode;
	label: 'Simple' | 'Classic';
	tagline: string;
	description: string;
	mailRootClass: string;
	settingsRootClass: string;
	settings: {
		useSidebar: boolean;
		showAppHeader: boolean;
		/** Flat text lists — no cards, large titles, or bordered groups. */
		editorial: boolean;
	};
	mail: {
		showAppHeaderOnMailRoutes: boolean;
		showMailboxSidebar: boolean;
		showEmptyReaderPane: boolean;
		useSectionedMessageList: boolean;
		useExpandedMessageList: boolean;
		useClassicSplitPanes: boolean;
		useAdaptiveReaderFocus: boolean;
		useFullscreenMobileReader: boolean;
	};
};
