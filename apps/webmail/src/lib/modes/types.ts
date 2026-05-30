import type { MailViewMode } from '$lib/mail/view-mode';

export type WebmailMode = MailViewMode;

export type WebmailModeDefinition = {
	id: WebmailMode;
	label: 'Simple' | 'Classic';
	settingsViewLabel: string;
	mailRootClass: string;
	settingsRootClass: string;
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
