import { browser } from '$app/environment';
import { requestBrowserNotificationPermission } from '$lib/utils/notifications';

export type ListDensity = 'comfortable' | 'compact';
export type ReaderTextSize = 'normal' | 'large';

const STORAGE = {
	blockExternal: 'zaur:block-external',
	listDensity: 'zaur:list-density',
	showListPreview: 'zaur:show-list-preview',
	showAvatars: 'zaur:show-avatars',
	showStarsInList: 'zaur:show-stars-in-list',
	showAttachmentIcons: 'zaur:show-attachment-icons',
	showMessageCounts: 'zaur:show-message-counts',
	showFullDatesInList: 'zaur:show-full-dates-in-list',
	showSenderEmailInList: 'zaur:show-sender-email-in-list',
	showListTimestamps: 'zaur:show-list-timestamps',
	highlightUnreadInList: 'zaur:highlight-unread-in-list',
	preferPlainText: 'zaur:prefer-plain-text',
	hideReaderRecipients: 'zaur:hide-reader-recipients',
	toolIconsOnly: 'zaur:tool-icons-only',
	collapseQuotedInCompose: 'zaur:collapse-quoted-in-compose',
	showFolderUnreadCounts: 'zaur:show-folder-unread-counts',
	showBulkSelect: 'zaur:show-bulk-select',
	hideHeaderSearch: 'zaur:hide-header-search',
	showQuickReply: 'zaur:show-quick-reply',
	showReaderContactActions: 'zaur:show-reader-contact-actions',
	expandAllThreadMessages: 'zaur:expand-all-thread-messages',
	compactLayout: 'zaur:compact-layout',
	hideComposeHints: 'zaur:hide-compose-hints',
	minimalReaderToolbar: 'zaur:minimal-reader-toolbar',
	hideSidebarShortcuts: 'zaur:hide-sidebar-shortcuts',
	expandListUntilOpen: 'zaur:expand-list-until-open',
	mailOnlyNavigation: 'zaur:mail-only-navigation',
	enableKeyboardShortcuts: 'zaur:enable-keyboard-shortcuts',
	confirmBeforeDelete: 'zaur:confirm-before-delete',
	skipHomeScreen: 'zaur:skip-home-screen',
	readerTextSize: 'zaur:reader-text-size',
	markAsReadOnOpen: 'zaur:mark-read-on-open',
	showUnreadInTitle: 'zaur:show-unread-in-title',
	notifyOnNewMail: 'zaur:notify-new-mail',
	displayName: (email: string) => `zaur:display-name:${email}`,
	signature: (email: string) => `zaur:signature:${email}`
} as const;

const LIST_ROW_HEIGHT: Record<ListDensity, { preview: string; noPreview: string }> = {
	comfortable: { preview: '4.25rem', noPreview: '3.25rem' },
	compact: { preview: '3rem', noPreview: '2.75rem' }
};

const READER_TEXT_SIZE: Record<ReaderTextSize, string> = {
	normal: '0.875rem',
	large: '1rem'
};

const READER_MEASURE: Record<ReaderTextSize, string> = {
	normal: '42rem',
	large: '48rem'
};

function readBlockExternal(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.blockExternal) !== 'false';
}

function readListDensity(): ListDensity {
	if (!browser) return 'comfortable';
	return localStorage.getItem(STORAGE.listDensity) === 'compact' ? 'compact' : 'comfortable';
}

function readShowListPreview(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showListPreview) !== 'false';
}

function readShowAvatars(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showAvatars) !== 'false';
}

function readShowStarsInList(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showStarsInList) !== 'false';
}

function readShowAttachmentIcons(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showAttachmentIcons) !== 'false';
}

function readShowMessageCounts(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showMessageCounts) !== 'false';
}

function readShowFullDatesInList(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.showFullDatesInList) === 'true';
}

function readShowSenderEmailInList(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.showSenderEmailInList) === 'true';
}

function readShowListTimestamps(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showListTimestamps) !== 'false';
}

function readHighlightUnreadInList(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.highlightUnreadInList) !== 'false';
}

function readPreferPlainText(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.preferPlainText) === 'true';
}

function readHideReaderRecipients(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideReaderRecipients) === 'true';
}

function readToolIconsOnly(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.toolIconsOnly) === 'true';
}

function readCollapseQuotedInCompose(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.collapseQuotedInCompose) === 'true';
}

function readShowFolderUnreadCounts(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showFolderUnreadCounts) !== 'false';
}

function readShowBulkSelect(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showBulkSelect) !== 'false';
}

function readHideHeaderSearch(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideHeaderSearch) === 'true';
}

function readShowQuickReply(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showQuickReply) !== 'false';
}

function readShowReaderContactActions(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showReaderContactActions) !== 'false';
}

function readExpandAllThreadMessages(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.expandAllThreadMessages) === 'true';
}

function readCompactLayout(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactLayout) === 'true';
}

function readHideComposeHints(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideComposeHints) === 'true';
}

function readMinimalReaderToolbar(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.minimalReaderToolbar) === 'true';
}

function readHideSidebarShortcuts(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideSidebarShortcuts) === 'true';
}

function readExpandListUntilOpen(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.expandListUntilOpen) === 'true';
}

function readMailOnlyNavigation(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.mailOnlyNavigation) === 'true';
}

function readEnableKeyboardShortcuts(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.enableKeyboardShortcuts) !== 'false';
}

function readConfirmBeforeDelete(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.confirmBeforeDelete) !== 'false';
}

function readSkipHomeScreen(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.skipHomeScreen) === 'true';
}

function readReaderTextSize(): ReaderTextSize {
	if (!browser) return 'normal';
	return localStorage.getItem(STORAGE.readerTextSize) === 'large' ? 'large' : 'normal';
}

function readMarkAsReadOnOpen(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.markAsReadOnOpen) !== 'false';
}

function readShowUnreadInTitle(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showUnreadInTitle) !== 'false';
}

function readNotifyOnNewMail(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.notifyOnNewMail) !== 'false';
}

function readDisplayName(email: string | null): string {
	if (!browser || !email) return '';
	return localStorage.getItem(STORAGE.displayName(email)) ?? '';
}

function readSignature(email: string | null): string {
	if (!browser || !email) return '';
	return localStorage.getItem(STORAGE.signature(email)) ?? '';
}

class SettingsStore {
	blockExternalContent = $state(readBlockExternal());
	listDensity = $state<ListDensity>(readListDensity());
	showListPreview = $state(readShowListPreview());
	showAvatars = $state(readShowAvatars());
	showStarsInList = $state(readShowStarsInList());
	showAttachmentIcons = $state(readShowAttachmentIcons());
	showMessageCounts = $state(readShowMessageCounts());
	showFullDatesInList = $state(readShowFullDatesInList());
	showSenderEmailInList = $state(readShowSenderEmailInList());
	showListTimestamps = $state(readShowListTimestamps());
	highlightUnreadInList = $state(readHighlightUnreadInList());
	preferPlainText = $state(readPreferPlainText());
	hideReaderRecipients = $state(readHideReaderRecipients());
	toolIconsOnly = $state(readToolIconsOnly());
	collapseQuotedInCompose = $state(readCollapseQuotedInCompose());
	showFolderUnreadCounts = $state(readShowFolderUnreadCounts());
	showBulkSelect = $state(readShowBulkSelect());
	hideHeaderSearch = $state(readHideHeaderSearch());
	showQuickReply = $state(readShowQuickReply());
	showReaderContactActions = $state(readShowReaderContactActions());
	expandAllThreadMessages = $state(readExpandAllThreadMessages());
	compactLayout = $state(readCompactLayout());
	hideComposeHints = $state(readHideComposeHints());
	minimalReaderToolbar = $state(readMinimalReaderToolbar());
	hideSidebarShortcuts = $state(readHideSidebarShortcuts());
	expandListUntilOpen = $state(readExpandListUntilOpen());
	mailOnlyNavigation = $state(readMailOnlyNavigation());
	enableKeyboardShortcuts = $state(readEnableKeyboardShortcuts());
	confirmBeforeDelete = $state(readConfirmBeforeDelete());
	skipHomeScreen = $state(readSkipHomeScreen());
	readerTextSize = $state<ReaderTextSize>(readReaderTextSize());
	markAsReadOnOpen = $state(readMarkAsReadOnOpen());
	showUnreadInTitle = $state(readShowUnreadInTitle());
	notifyOnNewMail = $state(readNotifyOnNewMail());
	displayName = $state('');
	signature = $state('');

	private userEmail: string | null = null;

	init() {
		this.blockExternalContent = readBlockExternal();
		this.listDensity = readListDensity();
		this.showListPreview = readShowListPreview();
		this.showAvatars = readShowAvatars();
		this.showStarsInList = readShowStarsInList();
		this.showAttachmentIcons = readShowAttachmentIcons();
		this.showMessageCounts = readShowMessageCounts();
		this.showFullDatesInList = readShowFullDatesInList();
		this.showSenderEmailInList = readShowSenderEmailInList();
		this.showListTimestamps = readShowListTimestamps();
		this.highlightUnreadInList = readHighlightUnreadInList();
		this.preferPlainText = readPreferPlainText();
		this.hideReaderRecipients = readHideReaderRecipients();
		this.toolIconsOnly = readToolIconsOnly();
		this.collapseQuotedInCompose = readCollapseQuotedInCompose();
		this.showFolderUnreadCounts = readShowFolderUnreadCounts();
		this.showBulkSelect = readShowBulkSelect();
		this.hideHeaderSearch = readHideHeaderSearch();
		this.showQuickReply = readShowQuickReply();
		this.showReaderContactActions = readShowReaderContactActions();
		this.expandAllThreadMessages = readExpandAllThreadMessages();
		this.compactLayout = readCompactLayout();
		this.hideComposeHints = readHideComposeHints();
		this.minimalReaderToolbar = readMinimalReaderToolbar();
		this.hideSidebarShortcuts = readHideSidebarShortcuts();
		this.applyLayoutWidth();
		this.expandListUntilOpen = readExpandListUntilOpen();
		this.mailOnlyNavigation = readMailOnlyNavigation();
		this.enableKeyboardShortcuts = readEnableKeyboardShortcuts();
		this.confirmBeforeDelete = readConfirmBeforeDelete();
		this.skipHomeScreen = readSkipHomeScreen();
		this.readerTextSize = readReaderTextSize();
		this.markAsReadOnOpen = readMarkAsReadOnOpen();
		this.showUnreadInTitle = readShowUnreadInTitle();
		this.notifyOnNewMail = readNotifyOnNewMail();
		this.applyListLayout();
		this.applyReaderTextSize(this.readerTextSize);
	}

	setUser(email: string | null) {
		this.userEmail = email;
		this.displayName = readDisplayName(email);
		this.signature = readSignature(email);
	}

	/** Prepend blank lines and signature before optional quoted reply/forward content. */
	composeBodyWithSignature(suffix = ''): string {
		const trimmed = this.signature.trim();
		if (!trimmed) return suffix;
		return `\n\n${trimmed}${suffix}`;
	}

	resolvedDisplayName(fallback?: string | null): string {
		const trimmed = this.displayName.trim();
		if (trimmed) return trimmed;
		const fromFallback = fallback?.trim();
		return fromFallback || 'User';
	}

	setBlockExternalContent(value: boolean) {
		this.blockExternalContent = value;
		if (browser) {
			localStorage.setItem(STORAGE.blockExternal, String(value));
		}
	}

	setListDensity(value: ListDensity) {
		this.listDensity = value;
		if (browser) {
			localStorage.setItem(STORAGE.listDensity, value);
		}
		this.applyListLayout();
	}

	setShowListPreview(value: boolean) {
		this.showListPreview = value;
		if (browser) {
			localStorage.setItem(STORAGE.showListPreview, String(value));
		}
		this.applyListLayout();
	}

	setShowAvatars(value: boolean) {
		this.showAvatars = value;
		if (browser) {
			localStorage.setItem(STORAGE.showAvatars, String(value));
		}
	}

	setShowStarsInList(value: boolean) {
		this.showStarsInList = value;
		if (browser) {
			localStorage.setItem(STORAGE.showStarsInList, String(value));
		}
	}

	setShowAttachmentIcons(value: boolean) {
		this.showAttachmentIcons = value;
		if (browser) {
			localStorage.setItem(STORAGE.showAttachmentIcons, String(value));
		}
	}

	setShowMessageCounts(value: boolean) {
		this.showMessageCounts = value;
		if (browser) {
			localStorage.setItem(STORAGE.showMessageCounts, String(value));
		}
	}

	setShowFullDatesInList(value: boolean) {
		this.showFullDatesInList = value;
		if (browser) {
			localStorage.setItem(STORAGE.showFullDatesInList, String(value));
		}
	}

	setShowSenderEmailInList(value: boolean) {
		this.showSenderEmailInList = value;
		if (browser) {
			localStorage.setItem(STORAGE.showSenderEmailInList, String(value));
		}
	}

	setShowListTimestamps(value: boolean) {
		this.showListTimestamps = value;
		if (browser) {
			localStorage.setItem(STORAGE.showListTimestamps, String(value));
		}
	}

	setHighlightUnreadInList(value: boolean) {
		this.highlightUnreadInList = value;
		if (browser) {
			localStorage.setItem(STORAGE.highlightUnreadInList, String(value));
		}
	}

	setPreferPlainText(value: boolean) {
		this.preferPlainText = value;
		if (browser) {
			localStorage.setItem(STORAGE.preferPlainText, String(value));
		}
	}

	setHideReaderRecipients(value: boolean) {
		this.hideReaderRecipients = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideReaderRecipients, String(value));
		}
	}

	setToolIconsOnly(value: boolean) {
		this.toolIconsOnly = value;
		if (browser) {
			localStorage.setItem(STORAGE.toolIconsOnly, String(value));
		}
	}

	setCollapseQuotedInCompose(value: boolean) {
		this.collapseQuotedInCompose = value;
		if (browser) {
			localStorage.setItem(STORAGE.collapseQuotedInCompose, String(value));
		}
	}

	setShowFolderUnreadCounts(value: boolean) {
		this.showFolderUnreadCounts = value;
		if (browser) {
			localStorage.setItem(STORAGE.showFolderUnreadCounts, String(value));
		}
	}

	setShowBulkSelect(value: boolean) {
		this.showBulkSelect = value;
		if (browser) {
			localStorage.setItem(STORAGE.showBulkSelect, String(value));
		}
	}

	setHideHeaderSearch(value: boolean) {
		this.hideHeaderSearch = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideHeaderSearch, String(value));
		}
	}

	setShowQuickReply(value: boolean) {
		this.showQuickReply = value;
		if (browser) {
			localStorage.setItem(STORAGE.showQuickReply, String(value));
		}
	}

	setShowReaderContactActions(value: boolean) {
		this.showReaderContactActions = value;
		if (browser) {
			localStorage.setItem(STORAGE.showReaderContactActions, String(value));
		}
	}

	setExpandAllThreadMessages(value: boolean) {
		this.expandAllThreadMessages = value;
		if (browser) {
			localStorage.setItem(STORAGE.expandAllThreadMessages, String(value));
		}
	}

	setCompactLayout(value: boolean) {
		this.compactLayout = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactLayout, String(value));
		}
		this.applyLayoutWidth();
	}

	setHideComposeHints(value: boolean) {
		this.hideComposeHints = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideComposeHints, String(value));
		}
	}

	setMinimalReaderToolbar(value: boolean) {
		this.minimalReaderToolbar = value;
		if (browser) {
			localStorage.setItem(STORAGE.minimalReaderToolbar, String(value));
		}
	}

	setHideSidebarShortcuts(value: boolean) {
		this.hideSidebarShortcuts = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideSidebarShortcuts, String(value));
		}
	}

	setExpandListUntilOpen(value: boolean) {
		this.expandListUntilOpen = value;
		if (browser) {
			localStorage.setItem(STORAGE.expandListUntilOpen, String(value));
		}
	}

	setMailOnlyNavigation(value: boolean) {
		this.mailOnlyNavigation = value;
		if (browser) {
			localStorage.setItem(STORAGE.mailOnlyNavigation, String(value));
		}
	}

	setEnableKeyboardShortcuts(value: boolean) {
		this.enableKeyboardShortcuts = value;
		if (browser) {
			localStorage.setItem(STORAGE.enableKeyboardShortcuts, String(value));
		}
	}

	setConfirmBeforeDelete(value: boolean) {
		this.confirmBeforeDelete = value;
		if (browser) {
			localStorage.setItem(STORAGE.confirmBeforeDelete, String(value));
		}
	}

	setSkipHomeScreen(value: boolean) {
		this.skipHomeScreen = value;
		if (browser) {
			localStorage.setItem(STORAGE.skipHomeScreen, String(value));
		}
	}

	setReaderTextSize(value: ReaderTextSize) {
		this.readerTextSize = value;
		if (browser) {
			localStorage.setItem(STORAGE.readerTextSize, value);
		}
		this.applyReaderTextSize(value);
	}

	setMarkAsReadOnOpen(value: boolean) {
		this.markAsReadOnOpen = value;
		if (browser) {
			localStorage.setItem(STORAGE.markAsReadOnOpen, String(value));
		}
	}

	setShowUnreadInTitle(value: boolean) {
		this.showUnreadInTitle = value;
		if (browser) {
			localStorage.setItem(STORAGE.showUnreadInTitle, String(value));
		}
		if (browser) {
			void import('$lib/utils/document-title').then(({ applyUnreadPrefixToDocument }) =>
				applyUnreadPrefixToDocument()
			);
		}
	}

	setNotifyOnNewMail(value: boolean) {
		this.notifyOnNewMail = value;
		if (browser) {
			localStorage.setItem(STORAGE.notifyOnNewMail, String(value));
			if (value) {
				void requestBrowserNotificationPermission();
			}
		}
	}

	setDisplayName(value: string) {
		this.displayName = value;
		if (!browser || !this.userEmail) return;

		const trimmed = value.trim();
		if (trimmed) {
			localStorage.setItem(STORAGE.displayName(this.userEmail), trimmed);
		} else {
			localStorage.removeItem(STORAGE.displayName(this.userEmail));
		}
	}

	setSignature(value: string) {
		this.signature = value;
		if (!browser || !this.userEmail) return;

		const trimmed = value.trim();
		if (trimmed) {
			localStorage.setItem(STORAGE.signature(this.userEmail), value);
		} else {
			localStorage.removeItem(STORAGE.signature(this.userEmail));
		}
	}

	resetDisplaySettings() {
		this.setListDensity('comfortable');
		this.setShowListPreview(true);
		this.setShowAvatars(true);
		this.setShowStarsInList(true);
		this.setShowAttachmentIcons(true);
		this.setShowMessageCounts(true);
		this.setShowFullDatesInList(false);
		this.setShowSenderEmailInList(false);
		this.setShowListTimestamps(true);
		this.setHighlightUnreadInList(true);
		this.setPreferPlainText(false);
		this.setHideReaderRecipients(false);
		this.setToolIconsOnly(false);
		this.setCollapseQuotedInCompose(false);
		this.setShowFolderUnreadCounts(true);
		this.setShowBulkSelect(true);
		this.setHideHeaderSearch(false);
		this.setExpandListUntilOpen(false);
		this.setReaderTextSize('normal');
		this.setBlockExternalContent(true);
		this.setShowQuickReply(true);
		this.setExpandAllThreadMessages(false);
		this.setShowReaderContactActions(true);
		this.setCompactLayout(false);
		this.setHideComposeHints(false);
		this.setMinimalReaderToolbar(false);
		this.setSkipHomeScreen(false);
		this.setHideSidebarShortcuts(false);
		this.setMailOnlyNavigation(false);
	}

	applySimpleMode() {
		this.setSkipHomeScreen(true);
		this.setMailOnlyNavigation(true);
		this.setShowAvatars(false);
		this.setShowStarsInList(false);
		this.setShowAttachmentIcons(false);
		this.setShowListPreview(false);
		this.setHideSidebarShortcuts(true);
		this.setHideHeaderSearch(true);
		this.setShowBulkSelect(false);
		this.setHideComposeHints(true);
		this.setMinimalReaderToolbar(true);
		this.setExpandListUntilOpen(true);
		this.setHighlightUnreadInList(false);
		this.setCompactLayout(true);
		this.setShowReaderContactActions(false);
		this.setShowQuickReply(false);
		this.setHideReaderRecipients(true);
		this.setToolIconsOnly(true);
		this.setCollapseQuotedInCompose(true);
	}

	private applyLayoutWidth() {
		if (!browser) return;
		document.documentElement.style.setProperty('--width-sidebar', this.compactLayout ? '12rem' : '15rem');
		document.documentElement.style.setProperty('--width-list', this.compactLayout ? '18rem' : '22rem');
	}

	private applyListLayout() {
		if (!browser) return;
		const heights = LIST_ROW_HEIGHT[this.listDensity];
		const height = this.showListPreview ? heights.preview : heights.noPreview;
		document.documentElement.style.setProperty('--z-list-row', height);
	}

	private applyReaderTextSize(value: ReaderTextSize) {
		if (!browser) return;
		document.documentElement.style.setProperty('--z-reader-text', READER_TEXT_SIZE[value]);
		document.documentElement.style.setProperty('--z-reader-measure', READER_MEASURE[value]);
	}
}

export const settings = new SettingsStore();
