import type { MailViewMode } from '$lib/mail/view-mode';
import type { WebmailModeDefinition } from './types';

export const WEBMAIL_MODES: Record<MailViewMode, WebmailModeDefinition> = {
	simple: {
		id: 'simple',
		label: 'Simple',
		settingsViewLabel: 'Simple view',
		mailRootClass: 'z-mail-view-simple',
		settingsRootClass: 'z-settings-mode-simple',
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
		settingsViewLabel: 'Classic view',
		mailRootClass: 'z-mail-view-traditional',
		settingsRootClass: 'z-settings-mode-classic',
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

export function webmailModeDefinition(mode: MailViewMode): WebmailModeDefinition {
	return WEBMAIL_MODES[mode];
}
