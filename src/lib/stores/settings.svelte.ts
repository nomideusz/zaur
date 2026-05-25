import { browser } from '$app/environment';
import { requestBrowserNotificationPermission } from '$lib/utils/notifications';

export type ListDensity = 'comfortable' | 'compact';
export type ReaderTextSize = 'normal' | 'large';

const STORAGE = {
	blockExternal: 'zaur:block-external',
	hideExternalContentBanner: 'zaur:hide-external-content-banner',
	autoLoadMore: 'zaur:auto-load-more',
	hideFolderSidebarHeader: 'zaur:hide-folder-sidebar-header',
	hideFolderIcons: 'zaur:hide-folder-icons',
	hideListHeader: 'zaur:hide-list-header',
	listDensity: 'zaur:list-density',
	showListPreview: 'zaur:show-list-preview',
	showAvatars: 'zaur:show-avatars',
	showStarsInList: 'zaur:show-stars-in-list',
	showAttachmentIcons: 'zaur:show-attachment-icons',
	showMessageCounts: 'zaur:show-message-counts',
	showFullDatesInList: 'zaur:show-full-dates-in-list',
	showSenderEmailInList: 'zaur:show-sender-email-in-list',
	subjectOnlyList: 'zaur:subject-only-list',
	showListTimestamps: 'zaur:show-list-timestamps',
	highlightUnreadInList: 'zaur:highlight-unread-in-list',
	preferPlainText: 'zaur:prefer-plain-text',
	hideReaderRecipients: 'zaur:hide-reader-recipients',
	toolIconsOnly: 'zaur:tool-icons-only',
	collapseQuotedInCompose: 'zaur:collapse-quoted-in-compose',
	hideEmptyReaderPrompts: 'zaur:hide-empty-reader-prompts',
	hideThreadSummary: 'zaur:hide-thread-summary',
	showFolderUnreadCounts: 'zaur:show-folder-unread-counts',
	showBulkSelect: 'zaur:show-bulk-select',
	hideHeaderSearch: 'zaur:hide-header-search',
	hideOfflineIndicator: 'zaur:hide-offline-indicator',
	showQuickReply: 'zaur:show-quick-reply',
	showReaderContactActions: 'zaur:show-reader-contact-actions',
	expandAllThreadMessages: 'zaur:expand-all-thread-messages',
	compactLayout: 'zaur:compact-layout',
	hideComposeHints: 'zaur:hide-compose-hints',
	showComposeContactSuggestions: 'zaur:show-compose-contact-suggestions',
	showSearchContactSuggestions: 'zaur:show-search-contact-suggestions',
	showCcBccInCompose: 'zaur:show-cc-bcc-in-compose',
	reduceMotion: 'zaur:reduce-motion',
	compactHeaderActions: 'zaur:compact-header-actions',
	hideAppTitle: 'zaur:hide-app-title',
	compactUserMenu: 'zaur:compact-user-menu',
	hideListEmptyHints: 'zaur:hide-list-empty-hints',
	hideSelectionHints: 'zaur:hide-selection-hints',
	hideReaderTimestamps: 'zaur:hide-reader-timestamps',
	hideCollapsedThreadPreviews: 'zaur:hide-collapsed-thread-previews',
	hideSettingsNavHints: 'zaur:hide-settings-nav-hints',
	compactFolderSidebar: 'zaur:compact-folder-sidebar',
	compactAttachments: 'zaur:compact-attachments',
	hideReaderSenderEmail: 'zaur:hide-reader-sender-email',
	iconOnlyBulkActions: 'zaur:icon-only-bulk-actions',
	hideComposeFromLine: 'zaur:hide-compose-from-line',
	hideThreadCollapseButtons: 'zaur:hide-thread-collapse-buttons',
	hideComposeFieldLabels: 'zaur:hide-compose-field-labels',
	compactComposePanel: 'zaur:compact-compose-panel',
	hideOutboxUnlessFailed: 'zaur:hide-outbox-unless-failed',
	hideListActiveIndicator: 'zaur:hide-list-active-indicator',
	compactListRows: 'zaur:compact-list-rows',
	hideMailShortcutsHelp: 'zaur:hide-mail-shortcuts-help',
	hideMoveMenuLabels: 'zaur:hide-move-menu-labels',
	iconOnlyComposeAttach: 'zaur:icon-only-compose-attach',
	compactReaderHeader: 'zaur:compact-reader-header',
	compactReaderBody: 'zaur:compact-reader-body',
	minimalLoadingStates: 'zaur:minimal-loading-states',
	hideConnectingScreen: 'zaur:hide-connecting-screen',
	compactToolSwitcher: 'zaur:compact-tool-switcher',
	hideSearchDropdownHeaders: 'zaur:hide-search-dropdown-headers',
	hidePaneBorders: 'zaur:hide-pane-borders',
	hideListRowDividers: 'zaur:hide-list-row-dividers',
	hideReaderPaneBorders: 'zaur:hide-reader-pane-borders',
	compactBulkToolbar: 'zaur:compact-bulk-toolbar',
	hideSearchListPrefix: 'zaur:hide-search-list-prefix',
	compactMobileSearch: 'zaur:compact-mobile-search',
	hideAccountFieldHints: 'zaur:hide-account-field-hints',
	compactQuickReply: 'zaur:compact-quick-reply',
	hideComposePanelBorders: 'zaur:hide-compose-panel-borders',
	iconOnlyComposeDiscard: 'zaur:icon-only-compose-discard',
	compactComposeAttachments: 'zaur:compact-compose-attachments',
	hideActionToasts: 'zaur:hide-action-toasts',
	compactSidebarShortcuts: 'zaur:compact-sidebar-shortcuts',
	compactToasts: 'zaur:compact-toasts',
	compactLoadMore: 'zaur:compact-load-more',
	compactUserMenuDropdown: 'zaur:compact-user-menu-dropdown',
	compactOutboxMenu: 'zaur:compact-outbox-menu',
	compactSettingsRows: 'zaur:compact-settings-rows',
	compactSettingsLayout: 'zaur:compact-settings-layout',
	compactSettingsPanel: 'zaur:compact-settings-panel',
	compactMoveMenu: 'zaur:compact-move-menu',
	compactSearchDropdown: 'zaur:compact-search-dropdown',
	compactComposeSuggestions: 'zaur:compact-compose-suggestions',
	compactOfflineIndicator: 'zaur:compact-offline-indicator',
	compactAppHeader: 'zaur:compact-app-header',
	compactEmptyReader: 'zaur:compact-empty-reader',
	compactSettingsNav: 'zaur:compact-settings-nav',
	compactExternalContentBanner: 'zaur:compact-external-content-banner',
	compactContactsPage: 'zaur:compact-contacts-page',
	compactContactsList: 'zaur:compact-contacts-list',
	hideContactMessageCounts: 'zaur:hide-contact-message-counts',
	rememberLastMailbox: 'zaur:remember-last-mailbox',
	lastMailbox: 'zaur:last-mailbox',
	minimalReaderToolbar: 'zaur:minimal-reader-toolbar',
	hideSidebarShortcuts: 'zaur:hide-sidebar-shortcuts',
	expandListUntilOpen: 'zaur:expand-list-until-open',
	mailOnlyNavigation: 'zaur:mail-only-navigation',
	enableKeyboardShortcuts: 'zaur:enable-keyboard-shortcuts',
	confirmBeforeDelete: 'zaur:confirm-before-delete',
	confirmBeforeDiscardCompose: 'zaur:confirm-before-discard-compose',
	returnToInboxAfterSend: 'zaur:return-to-inbox-after-send',
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

function readHideExternalContentBanner(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideExternalContentBanner) === 'true';
}

function readAutoLoadMore(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.autoLoadMore) === 'true';
}

function readHideFolderSidebarHeader(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideFolderSidebarHeader) === 'true';
}

function readHideFolderIcons(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideFolderIcons) === 'true';
}

function readHideListHeader(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideListHeader) === 'true';
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

function readSubjectOnlyList(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.subjectOnlyList) === 'true';
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

function readHideEmptyReaderPrompts(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideEmptyReaderPrompts) === 'true';
}

function readHideThreadSummary(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideThreadSummary) === 'true';
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

function readHideOfflineIndicator(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideOfflineIndicator) === 'true';
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

function readShowComposeContactSuggestions(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showComposeContactSuggestions) !== 'false';
}

function readShowSearchContactSuggestions(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showSearchContactSuggestions) !== 'false';
}

function readShowCcBccInCompose(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showCcBccInCompose) !== 'false';
}

function readReduceMotion(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.reduceMotion) === 'true';
}

function readCompactHeaderActions(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactHeaderActions) === 'true';
}

function readRememberLastMailbox(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.rememberLastMailbox) === 'true';
}

function readHideAppTitle(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideAppTitle) === 'true';
}

function readCompactUserMenu(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactUserMenu) === 'true';
}

function readHideListEmptyHints(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideListEmptyHints) === 'true';
}

function readHideSelectionHints(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideSelectionHints) === 'true';
}

function readHideReaderTimestamps(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideReaderTimestamps) === 'true';
}

function readHideCollapsedThreadPreviews(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideCollapsedThreadPreviews) === 'true';
}

function readHideSettingsNavHints(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideSettingsNavHints) === 'true';
}

function readCompactFolderSidebar(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactFolderSidebar) === 'true';
}

function readCompactAttachments(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactAttachments) === 'true';
}

function readHideReaderSenderEmail(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideReaderSenderEmail) === 'true';
}

function readIconOnlyBulkActions(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.iconOnlyBulkActions) === 'true';
}

function readHideComposeFromLine(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideComposeFromLine) === 'true';
}

function readHideThreadCollapseButtons(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideThreadCollapseButtons) === 'true';
}

function readHideComposeFieldLabels(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideComposeFieldLabels) === 'true';
}

function readCompactComposePanel(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactComposePanel) === 'true';
}

function readHideOutboxUnlessFailed(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideOutboxUnlessFailed) === 'true';
}

function readHideListActiveIndicator(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideListActiveIndicator) === 'true';
}

function readCompactListRows(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactListRows) === 'true';
}

function readHideMailShortcutsHelp(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideMailShortcutsHelp) === 'true';
}

function readHideMoveMenuLabels(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideMoveMenuLabels) === 'true';
}

function readIconOnlyComposeAttach(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.iconOnlyComposeAttach) === 'true';
}

function readCompactReaderHeader(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactReaderHeader) === 'true';
}

function readCompactReaderBody(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactReaderBody) === 'true';
}

function readMinimalLoadingStates(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.minimalLoadingStates) === 'true';
}

function readHideConnectingScreen(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideConnectingScreen) === 'true';
}

function readCompactToolSwitcher(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactToolSwitcher) === 'true';
}

function readHideSearchDropdownHeaders(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideSearchDropdownHeaders) === 'true';
}

function readHidePaneBorders(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hidePaneBorders) === 'true';
}

function readHideListRowDividers(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideListRowDividers) === 'true';
}

function readHideReaderPaneBorders(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideReaderPaneBorders) === 'true';
}

function readCompactBulkToolbar(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactBulkToolbar) === 'true';
}

function readHideSearchListPrefix(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideSearchListPrefix) === 'true';
}

function readCompactMobileSearch(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactMobileSearch) === 'true';
}

function readHideAccountFieldHints(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideAccountFieldHints) === 'true';
}

function readCompactQuickReply(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactQuickReply) === 'true';
}

function readHideComposePanelBorders(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideComposePanelBorders) === 'true';
}

function readIconOnlyComposeDiscard(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.iconOnlyComposeDiscard) === 'true';
}

function readCompactComposeAttachments(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactComposeAttachments) === 'true';
}

function readHideActionToasts(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideActionToasts) === 'true';
}

function readCompactSidebarShortcuts(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactSidebarShortcuts) === 'true';
}

function readCompactToasts(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactToasts) === 'true';
}

function readCompactLoadMore(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactLoadMore) === 'true';
}

function readCompactUserMenuDropdown(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactUserMenuDropdown) === 'true';
}

function readCompactOutboxMenu(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactOutboxMenu) === 'true';
}

function readCompactSettingsRows(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactSettingsRows) === 'true';
}

function readCompactSettingsLayout(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactSettingsLayout) === 'true';
}

function readCompactSettingsPanel(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactSettingsPanel) === 'true';
}

function readCompactMoveMenu(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactMoveMenu) === 'true';
}

function readCompactSearchDropdown(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactSearchDropdown) === 'true';
}

function readCompactComposeSuggestions(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactComposeSuggestions) === 'true';
}

function readCompactOfflineIndicator(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactOfflineIndicator) === 'true';
}

function readCompactAppHeader(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactAppHeader) === 'true';
}

function readCompactEmptyReader(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactEmptyReader) === 'true';
}

function readCompactSettingsNav(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactSettingsNav) === 'true';
}

function readCompactExternalContentBanner(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactExternalContentBanner) === 'true';
}

function readCompactContactsPage(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactContactsPage) === 'true';
}

function readCompactContactsList(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactContactsList) === 'true';
}

function readHideContactMessageCounts(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideContactMessageCounts) === 'true';
}

function readLastMailbox(): string {
	if (!browser) return 'inbox';
	const saved = localStorage.getItem(STORAGE.lastMailbox);
	return saved?.trim() || 'inbox';
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

function readConfirmBeforeDiscardCompose(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.confirmBeforeDiscardCompose) !== 'false';
}

function readReturnToInboxAfterSend(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.returnToInboxAfterSend) === 'true';
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
	hideExternalContentBanner = $state(readHideExternalContentBanner());
	autoLoadMore = $state(readAutoLoadMore());
	hideFolderSidebarHeader = $state(readHideFolderSidebarHeader());
	hideFolderIcons = $state(readHideFolderIcons());
	hideListHeader = $state(readHideListHeader());
	listDensity = $state<ListDensity>(readListDensity());
	showListPreview = $state(readShowListPreview());
	showAvatars = $state(readShowAvatars());
	showStarsInList = $state(readShowStarsInList());
	showAttachmentIcons = $state(readShowAttachmentIcons());
	showMessageCounts = $state(readShowMessageCounts());
	showFullDatesInList = $state(readShowFullDatesInList());
	showSenderEmailInList = $state(readShowSenderEmailInList());
	subjectOnlyList = $state(readSubjectOnlyList());
	showListTimestamps = $state(readShowListTimestamps());
	highlightUnreadInList = $state(readHighlightUnreadInList());
	preferPlainText = $state(readPreferPlainText());
	hideReaderRecipients = $state(readHideReaderRecipients());
	toolIconsOnly = $state(readToolIconsOnly());
	collapseQuotedInCompose = $state(readCollapseQuotedInCompose());
	hideEmptyReaderPrompts = $state(readHideEmptyReaderPrompts());
	hideThreadSummary = $state(readHideThreadSummary());
	showFolderUnreadCounts = $state(readShowFolderUnreadCounts());
	showBulkSelect = $state(readShowBulkSelect());
	hideHeaderSearch = $state(readHideHeaderSearch());
	hideOfflineIndicator = $state(readHideOfflineIndicator());
	showQuickReply = $state(readShowQuickReply());
	showReaderContactActions = $state(readShowReaderContactActions());
	expandAllThreadMessages = $state(readExpandAllThreadMessages());
	compactLayout = $state(readCompactLayout());
	hideComposeHints = $state(readHideComposeHints());
	showComposeContactSuggestions = $state(readShowComposeContactSuggestions());
	showSearchContactSuggestions = $state(readShowSearchContactSuggestions());
	showCcBccInCompose = $state(readShowCcBccInCompose());
	reduceMotion = $state(readReduceMotion());
	compactHeaderActions = $state(readCompactHeaderActions());
	hideAppTitle = $state(readHideAppTitle());
	compactUserMenu = $state(readCompactUserMenu());
	hideListEmptyHints = $state(readHideListEmptyHints());
	hideSelectionHints = $state(readHideSelectionHints());
	hideReaderTimestamps = $state(readHideReaderTimestamps());
	hideCollapsedThreadPreviews = $state(readHideCollapsedThreadPreviews());
	hideSettingsNavHints = $state(readHideSettingsNavHints());
	compactFolderSidebar = $state(readCompactFolderSidebar());
	compactAttachments = $state(readCompactAttachments());
	hideReaderSenderEmail = $state(readHideReaderSenderEmail());
	iconOnlyBulkActions = $state(readIconOnlyBulkActions());
	hideComposeFromLine = $state(readHideComposeFromLine());
	hideThreadCollapseButtons = $state(readHideThreadCollapseButtons());
	hideComposeFieldLabels = $state(readHideComposeFieldLabels());
	compactComposePanel = $state(readCompactComposePanel());
	hideOutboxUnlessFailed = $state(readHideOutboxUnlessFailed());
	hideListActiveIndicator = $state(readHideListActiveIndicator());
	compactListRows = $state(readCompactListRows());
	hideMailShortcutsHelp = $state(readHideMailShortcutsHelp());
	hideMoveMenuLabels = $state(readHideMoveMenuLabels());
	iconOnlyComposeAttach = $state(readIconOnlyComposeAttach());
	compactReaderHeader = $state(readCompactReaderHeader());
	compactReaderBody = $state(readCompactReaderBody());
	minimalLoadingStates = $state(readMinimalLoadingStates());
	hideConnectingScreen = $state(readHideConnectingScreen());
	compactToolSwitcher = $state(readCompactToolSwitcher());
	hideSearchDropdownHeaders = $state(readHideSearchDropdownHeaders());
	hidePaneBorders = $state(readHidePaneBorders());
	hideListRowDividers = $state(readHideListRowDividers());
	hideReaderPaneBorders = $state(readHideReaderPaneBorders());
	compactBulkToolbar = $state(readCompactBulkToolbar());
	hideSearchListPrefix = $state(readHideSearchListPrefix());
	compactMobileSearch = $state(readCompactMobileSearch());
	hideAccountFieldHints = $state(readHideAccountFieldHints());
	compactQuickReply = $state(readCompactQuickReply());
	hideComposePanelBorders = $state(readHideComposePanelBorders());
	iconOnlyComposeDiscard = $state(readIconOnlyComposeDiscard());
	compactComposeAttachments = $state(readCompactComposeAttachments());
	hideActionToasts = $state(readHideActionToasts());
	compactSidebarShortcuts = $state(readCompactSidebarShortcuts());
	compactToasts = $state(readCompactToasts());
	compactLoadMore = $state(readCompactLoadMore());
	compactUserMenuDropdown = $state(readCompactUserMenuDropdown());
	compactOutboxMenu = $state(readCompactOutboxMenu());
	compactSettingsRows = $state(readCompactSettingsRows());
	compactSettingsLayout = $state(readCompactSettingsLayout());
	compactSettingsPanel = $state(readCompactSettingsPanel());
	compactMoveMenu = $state(readCompactMoveMenu());
	compactSearchDropdown = $state(readCompactSearchDropdown());
	compactComposeSuggestions = $state(readCompactComposeSuggestions());
	compactOfflineIndicator = $state(readCompactOfflineIndicator());
	compactAppHeader = $state(readCompactAppHeader());
	compactEmptyReader = $state(readCompactEmptyReader());
	compactSettingsNav = $state(readCompactSettingsNav());
	compactExternalContentBanner = $state(readCompactExternalContentBanner());
	compactContactsPage = $state(readCompactContactsPage());
	compactContactsList = $state(readCompactContactsList());
	hideContactMessageCounts = $state(readHideContactMessageCounts());
	rememberLastMailbox = $state(readRememberLastMailbox());
	minimalReaderToolbar = $state(readMinimalReaderToolbar());
	hideSidebarShortcuts = $state(readHideSidebarShortcuts());
	expandListUntilOpen = $state(readExpandListUntilOpen());
	mailOnlyNavigation = $state(readMailOnlyNavigation());
	enableKeyboardShortcuts = $state(readEnableKeyboardShortcuts());
	confirmBeforeDelete = $state(readConfirmBeforeDelete());
	confirmBeforeDiscardCompose = $state(readConfirmBeforeDiscardCompose());
	returnToInboxAfterSend = $state(readReturnToInboxAfterSend());
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
		this.hideExternalContentBanner = readHideExternalContentBanner();
		this.autoLoadMore = readAutoLoadMore();
		this.hideFolderSidebarHeader = readHideFolderSidebarHeader();
		this.hideFolderIcons = readHideFolderIcons();
		this.hideListHeader = readHideListHeader();
		this.listDensity = readListDensity();
		this.showListPreview = readShowListPreview();
		this.showAvatars = readShowAvatars();
		this.showStarsInList = readShowStarsInList();
		this.showAttachmentIcons = readShowAttachmentIcons();
		this.showMessageCounts = readShowMessageCounts();
		this.showFullDatesInList = readShowFullDatesInList();
		this.showSenderEmailInList = readShowSenderEmailInList();
		this.subjectOnlyList = readSubjectOnlyList();
		this.showListTimestamps = readShowListTimestamps();
		this.highlightUnreadInList = readHighlightUnreadInList();
		this.preferPlainText = readPreferPlainText();
		this.hideReaderRecipients = readHideReaderRecipients();
		this.toolIconsOnly = readToolIconsOnly();
		this.collapseQuotedInCompose = readCollapseQuotedInCompose();
		this.hideEmptyReaderPrompts = readHideEmptyReaderPrompts();
		this.hideThreadSummary = readHideThreadSummary();
		this.showFolderUnreadCounts = readShowFolderUnreadCounts();
		this.showBulkSelect = readShowBulkSelect();
		this.hideHeaderSearch = readHideHeaderSearch();
		this.hideOfflineIndicator = readHideOfflineIndicator();
		this.showQuickReply = readShowQuickReply();
		this.showReaderContactActions = readShowReaderContactActions();
		this.expandAllThreadMessages = readExpandAllThreadMessages();
		this.compactLayout = readCompactLayout();
		this.hideComposeHints = readHideComposeHints();
		this.showComposeContactSuggestions = readShowComposeContactSuggestions();
		this.showSearchContactSuggestions = readShowSearchContactSuggestions();
		this.showCcBccInCompose = readShowCcBccInCompose();
		this.reduceMotion = readReduceMotion();
		this.compactHeaderActions = readCompactHeaderActions();
		this.hideAppTitle = readHideAppTitle();
		this.compactUserMenu = readCompactUserMenu();
		this.hideListEmptyHints = readHideListEmptyHints();
		this.hideSelectionHints = readHideSelectionHints();
		this.hideReaderTimestamps = readHideReaderTimestamps();
		this.hideCollapsedThreadPreviews = readHideCollapsedThreadPreviews();
		this.hideSettingsNavHints = readHideSettingsNavHints();
		this.compactFolderSidebar = readCompactFolderSidebar();
		this.compactAttachments = readCompactAttachments();
		this.hideReaderSenderEmail = readHideReaderSenderEmail();
		this.iconOnlyBulkActions = readIconOnlyBulkActions();
		this.hideComposeFromLine = readHideComposeFromLine();
		this.hideThreadCollapseButtons = readHideThreadCollapseButtons();
		this.hideComposeFieldLabels = readHideComposeFieldLabels();
		this.compactComposePanel = readCompactComposePanel();
		this.hideOutboxUnlessFailed = readHideOutboxUnlessFailed();
		this.hideListActiveIndicator = readHideListActiveIndicator();
		this.compactListRows = readCompactListRows();
		this.hideMailShortcutsHelp = readHideMailShortcutsHelp();
		this.hideMoveMenuLabels = readHideMoveMenuLabels();
		this.iconOnlyComposeAttach = readIconOnlyComposeAttach();
		this.compactReaderHeader = readCompactReaderHeader();
		this.compactReaderBody = readCompactReaderBody();
		this.minimalLoadingStates = readMinimalLoadingStates();
		this.hideConnectingScreen = readHideConnectingScreen();
		this.compactToolSwitcher = readCompactToolSwitcher();
		this.hideSearchDropdownHeaders = readHideSearchDropdownHeaders();
		this.hidePaneBorders = readHidePaneBorders();
		this.hideListRowDividers = readHideListRowDividers();
		this.hideReaderPaneBorders = readHideReaderPaneBorders();
		this.compactBulkToolbar = readCompactBulkToolbar();
		this.hideSearchListPrefix = readHideSearchListPrefix();
		this.compactMobileSearch = readCompactMobileSearch();
		this.hideAccountFieldHints = readHideAccountFieldHints();
		this.compactQuickReply = readCompactQuickReply();
		this.hideComposePanelBorders = readHideComposePanelBorders();
		this.iconOnlyComposeDiscard = readIconOnlyComposeDiscard();
		this.compactComposeAttachments = readCompactComposeAttachments();
		this.hideActionToasts = readHideActionToasts();
		this.compactSidebarShortcuts = readCompactSidebarShortcuts();
		this.compactToasts = readCompactToasts();
		this.compactLoadMore = readCompactLoadMore();
		this.compactUserMenuDropdown = readCompactUserMenuDropdown();
		this.compactOutboxMenu = readCompactOutboxMenu();
		this.compactSettingsRows = readCompactSettingsRows();
		this.compactSettingsLayout = readCompactSettingsLayout();
		this.compactSettingsPanel = readCompactSettingsPanel();
		this.compactMoveMenu = readCompactMoveMenu();
		this.compactSearchDropdown = readCompactSearchDropdown();
		this.compactComposeSuggestions = readCompactComposeSuggestions();
		this.compactOfflineIndicator = readCompactOfflineIndicator();
		this.compactAppHeader = readCompactAppHeader();
		this.compactEmptyReader = readCompactEmptyReader();
		this.compactSettingsNav = readCompactSettingsNav();
		this.compactExternalContentBanner = readCompactExternalContentBanner();
		this.compactContactsPage = readCompactContactsPage();
		this.compactContactsList = readCompactContactsList();
		this.hideContactMessageCounts = readHideContactMessageCounts();
		this.rememberLastMailbox = readRememberLastMailbox();
		this.minimalReaderToolbar = readMinimalReaderToolbar();
		this.applyReduceMotion();
		this.hideSidebarShortcuts = readHideSidebarShortcuts();
		this.applyLayoutWidth();
		this.applyHeaderLayout();
		this.expandListUntilOpen = readExpandListUntilOpen();
		this.mailOnlyNavigation = readMailOnlyNavigation();
		this.enableKeyboardShortcuts = readEnableKeyboardShortcuts();
		this.confirmBeforeDelete = readConfirmBeforeDelete();
		this.confirmBeforeDiscardCompose = readConfirmBeforeDiscardCompose();
		this.returnToInboxAfterSend = readReturnToInboxAfterSend();
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

	setHideExternalContentBanner(value: boolean) {
		this.hideExternalContentBanner = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideExternalContentBanner, String(value));
		}
	}

	setAutoLoadMore(value: boolean) {
		this.autoLoadMore = value;
		if (browser) {
			localStorage.setItem(STORAGE.autoLoadMore, String(value));
		}
	}

	setHideFolderSidebarHeader(value: boolean) {
		this.hideFolderSidebarHeader = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideFolderSidebarHeader, String(value));
		}
	}

	setHideFolderIcons(value: boolean) {
		this.hideFolderIcons = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideFolderIcons, String(value));
		}
	}

	setHideListHeader(value: boolean) {
		this.hideListHeader = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideListHeader, String(value));
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

	setSubjectOnlyList(value: boolean) {
		this.subjectOnlyList = value;
		if (browser) {
			localStorage.setItem(STORAGE.subjectOnlyList, String(value));
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

	setHideEmptyReaderPrompts(value: boolean) {
		this.hideEmptyReaderPrompts = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideEmptyReaderPrompts, String(value));
		}
	}

	setHideThreadSummary(value: boolean) {
		this.hideThreadSummary = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideThreadSummary, String(value));
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

	setHideOfflineIndicator(value: boolean) {
		this.hideOfflineIndicator = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideOfflineIndicator, String(value));
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

	setShowComposeContactSuggestions(value: boolean) {
		this.showComposeContactSuggestions = value;
		if (browser) {
			localStorage.setItem(STORAGE.showComposeContactSuggestions, String(value));
		}
	}

	setShowSearchContactSuggestions(value: boolean) {
		this.showSearchContactSuggestions = value;
		if (browser) {
			localStorage.setItem(STORAGE.showSearchContactSuggestions, String(value));
		}
	}

	setShowCcBccInCompose(value: boolean) {
		this.showCcBccInCompose = value;
		if (browser) {
			localStorage.setItem(STORAGE.showCcBccInCompose, String(value));
		}
	}

	setReduceMotion(value: boolean) {
		this.reduceMotion = value;
		if (browser) {
			localStorage.setItem(STORAGE.reduceMotion, String(value));
		}
		this.applyReduceMotion();
	}

	setCompactHeaderActions(value: boolean) {
		this.compactHeaderActions = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactHeaderActions, String(value));
		}
	}

	setRememberLastMailbox(value: boolean) {
		this.rememberLastMailbox = value;
		if (browser) {
			localStorage.setItem(STORAGE.rememberLastMailbox, String(value));
		}
	}

	setHideAppTitle(value: boolean) {
		this.hideAppTitle = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideAppTitle, String(value));
		}
	}

	setCompactUserMenu(value: boolean) {
		this.compactUserMenu = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactUserMenu, String(value));
		}
	}

	setHideListEmptyHints(value: boolean) {
		this.hideListEmptyHints = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideListEmptyHints, String(value));
		}
	}

	setHideSelectionHints(value: boolean) {
		this.hideSelectionHints = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideSelectionHints, String(value));
		}
	}

	setHideReaderTimestamps(value: boolean) {
		this.hideReaderTimestamps = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideReaderTimestamps, String(value));
		}
	}

	setHideCollapsedThreadPreviews(value: boolean) {
		this.hideCollapsedThreadPreviews = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideCollapsedThreadPreviews, String(value));
		}
	}

	setHideSettingsNavHints(value: boolean) {
		this.hideSettingsNavHints = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideSettingsNavHints, String(value));
		}
	}

	setCompactFolderSidebar(value: boolean) {
		this.compactFolderSidebar = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactFolderSidebar, String(value));
		}
	}

	setCompactAttachments(value: boolean) {
		this.compactAttachments = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactAttachments, String(value));
		}
	}

	setHideReaderSenderEmail(value: boolean) {
		this.hideReaderSenderEmail = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideReaderSenderEmail, String(value));
		}
	}

	setIconOnlyBulkActions(value: boolean) {
		this.iconOnlyBulkActions = value;
		if (browser) {
			localStorage.setItem(STORAGE.iconOnlyBulkActions, String(value));
		}
	}

	setHideComposeFromLine(value: boolean) {
		this.hideComposeFromLine = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideComposeFromLine, String(value));
		}
	}

	setHideThreadCollapseButtons(value: boolean) {
		this.hideThreadCollapseButtons = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideThreadCollapseButtons, String(value));
		}
	}

	setHideComposeFieldLabels(value: boolean) {
		this.hideComposeFieldLabels = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideComposeFieldLabels, String(value));
		}
	}

	setCompactComposePanel(value: boolean) {
		this.compactComposePanel = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactComposePanel, String(value));
		}
	}

	setHideOutboxUnlessFailed(value: boolean) {
		this.hideOutboxUnlessFailed = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideOutboxUnlessFailed, String(value));
		}
	}

	setHideListActiveIndicator(value: boolean) {
		this.hideListActiveIndicator = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideListActiveIndicator, String(value));
		}
	}

	setCompactListRows(value: boolean) {
		this.compactListRows = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactListRows, String(value));
		}
	}

	setHideMailShortcutsHelp(value: boolean) {
		this.hideMailShortcutsHelp = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideMailShortcutsHelp, String(value));
		}
	}

	setHideMoveMenuLabels(value: boolean) {
		this.hideMoveMenuLabels = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideMoveMenuLabels, String(value));
		}
	}

	setIconOnlyComposeAttach(value: boolean) {
		this.iconOnlyComposeAttach = value;
		if (browser) {
			localStorage.setItem(STORAGE.iconOnlyComposeAttach, String(value));
		}
	}

	setCompactReaderHeader(value: boolean) {
		this.compactReaderHeader = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactReaderHeader, String(value));
		}
	}

	setCompactReaderBody(value: boolean) {
		this.compactReaderBody = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactReaderBody, String(value));
		}
	}

	setMinimalLoadingStates(value: boolean) {
		this.minimalLoadingStates = value;
		if (browser) {
			localStorage.setItem(STORAGE.minimalLoadingStates, String(value));
		}
	}

	setHideConnectingScreen(value: boolean) {
		this.hideConnectingScreen = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideConnectingScreen, String(value));
		}
	}

	setCompactToolSwitcher(value: boolean) {
		this.compactToolSwitcher = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactToolSwitcher, String(value));
		}
	}

	setHideSearchDropdownHeaders(value: boolean) {
		this.hideSearchDropdownHeaders = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideSearchDropdownHeaders, String(value));
		}
	}

	setHidePaneBorders(value: boolean) {
		this.hidePaneBorders = value;
		if (browser) {
			localStorage.setItem(STORAGE.hidePaneBorders, String(value));
		}
	}

	setHideListRowDividers(value: boolean) {
		this.hideListRowDividers = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideListRowDividers, String(value));
		}
	}

	setHideReaderPaneBorders(value: boolean) {
		this.hideReaderPaneBorders = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideReaderPaneBorders, String(value));
		}
	}

	setCompactBulkToolbar(value: boolean) {
		this.compactBulkToolbar = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactBulkToolbar, String(value));
		}
	}

	setHideSearchListPrefix(value: boolean) {
		this.hideSearchListPrefix = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideSearchListPrefix, String(value));
		}
	}

	setCompactMobileSearch(value: boolean) {
		this.compactMobileSearch = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactMobileSearch, String(value));
		}
	}

	setHideAccountFieldHints(value: boolean) {
		this.hideAccountFieldHints = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideAccountFieldHints, String(value));
		}
	}

	setCompactQuickReply(value: boolean) {
		this.compactQuickReply = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactQuickReply, String(value));
		}
	}

	setHideComposePanelBorders(value: boolean) {
		this.hideComposePanelBorders = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideComposePanelBorders, String(value));
		}
	}

	setIconOnlyComposeDiscard(value: boolean) {
		this.iconOnlyComposeDiscard = value;
		if (browser) {
			localStorage.setItem(STORAGE.iconOnlyComposeDiscard, String(value));
		}
	}

	setCompactComposeAttachments(value: boolean) {
		this.compactComposeAttachments = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactComposeAttachments, String(value));
		}
	}

	setHideActionToasts(value: boolean) {
		this.hideActionToasts = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideActionToasts, String(value));
		}
	}

	setCompactSidebarShortcuts(value: boolean) {
		this.compactSidebarShortcuts = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactSidebarShortcuts, String(value));
		}
	}

	setCompactToasts(value: boolean) {
		this.compactToasts = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactToasts, String(value));
		}
	}

	setCompactLoadMore(value: boolean) {
		this.compactLoadMore = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactLoadMore, String(value));
		}
	}

	setCompactUserMenuDropdown(value: boolean) {
		this.compactUserMenuDropdown = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactUserMenuDropdown, String(value));
		}
	}

	setCompactOutboxMenu(value: boolean) {
		this.compactOutboxMenu = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactOutboxMenu, String(value));
		}
	}

	setCompactSettingsRows(value: boolean) {
		this.compactSettingsRows = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactSettingsRows, String(value));
		}
	}

	setCompactSettingsLayout(value: boolean) {
		this.compactSettingsLayout = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactSettingsLayout, String(value));
		}
	}

	setCompactSettingsPanel(value: boolean) {
		this.compactSettingsPanel = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactSettingsPanel, String(value));
		}
	}

	setCompactMoveMenu(value: boolean) {
		this.compactMoveMenu = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactMoveMenu, String(value));
		}
	}

	setCompactSearchDropdown(value: boolean) {
		this.compactSearchDropdown = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactSearchDropdown, String(value));
		}
	}

	setCompactComposeSuggestions(value: boolean) {
		this.compactComposeSuggestions = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactComposeSuggestions, String(value));
		}
	}

	setCompactOfflineIndicator(value: boolean) {
		this.compactOfflineIndicator = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactOfflineIndicator, String(value));
		}
	}

	setCompactAppHeader(value: boolean) {
		this.compactAppHeader = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactAppHeader, String(value));
		}
		this.applyHeaderLayout();
	}

	setCompactEmptyReader(value: boolean) {
		this.compactEmptyReader = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactEmptyReader, String(value));
		}
	}

	setCompactSettingsNav(value: boolean) {
		this.compactSettingsNav = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactSettingsNav, String(value));
		}
	}

	setCompactExternalContentBanner(value: boolean) {
		this.compactExternalContentBanner = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactExternalContentBanner, String(value));
		}
	}

	setCompactContactsPage(value: boolean) {
		this.compactContactsPage = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactContactsPage, String(value));
		}
	}

	setCompactContactsList(value: boolean) {
		this.compactContactsList = value;
		if (browser) {
			localStorage.setItem(STORAGE.compactContactsList, String(value));
		}
	}

	setHideContactMessageCounts(value: boolean) {
		this.hideContactMessageCounts = value;
		if (browser) {
			localStorage.setItem(STORAGE.hideContactMessageCounts, String(value));
		}
	}

	setLastMailbox(routeId: string) {
		if (!browser || !routeId.trim()) return;
		localStorage.setItem(STORAGE.lastMailbox, routeId.trim());
	}

	preferredMailHref(): string {
		if (!this.rememberLastMailbox) return '/mail/inbox';
		return `/mail/${readLastMailbox()}`;
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

	setConfirmBeforeDiscardCompose(value: boolean) {
		this.confirmBeforeDiscardCompose = value;
		if (browser) {
			localStorage.setItem(STORAGE.confirmBeforeDiscardCompose, String(value));
		}
	}

	setReturnToInboxAfterSend(value: boolean) {
		this.returnToInboxAfterSend = value;
		if (browser) {
			localStorage.setItem(STORAGE.returnToInboxAfterSend, String(value));
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
		this.setSubjectOnlyList(false);
		this.setShowListTimestamps(true);
		this.setHighlightUnreadInList(true);
		this.setPreferPlainText(false);
		this.setHideReaderRecipients(false);
		this.setToolIconsOnly(false);
		this.setCollapseQuotedInCompose(false);
		this.setHideEmptyReaderPrompts(false);
		this.setHideThreadSummary(false);
		this.setShowFolderUnreadCounts(true);
		this.setShowBulkSelect(true);
		this.setHideHeaderSearch(false);
		this.setHideOfflineIndicator(false);
		this.setExpandListUntilOpen(false);
		this.setReaderTextSize('normal');
		this.setBlockExternalContent(true);
		this.setHideExternalContentBanner(false);
		this.setAutoLoadMore(false);
		this.setHideFolderSidebarHeader(false);
		this.setHideFolderIcons(false);
		this.setHideListHeader(false);
		this.setShowQuickReply(true);
		this.setExpandAllThreadMessages(false);
		this.setShowReaderContactActions(true);
		this.setCompactLayout(false);
		this.setHideComposeHints(false);
		this.setShowComposeContactSuggestions(true);
		this.setShowSearchContactSuggestions(true);
		this.setShowCcBccInCompose(true);
		this.setReduceMotion(false);
		this.setCompactHeaderActions(false);
		this.setHideAppTitle(false);
		this.setCompactUserMenu(false);
		this.setHideListEmptyHints(false);
		this.setHideSelectionHints(false);
		this.setHideReaderTimestamps(false);
		this.setHideCollapsedThreadPreviews(false);
		this.setHideSettingsNavHints(false);
		this.setCompactFolderSidebar(false);
		this.setCompactAttachments(false);
		this.setHideReaderSenderEmail(false);
		this.setIconOnlyBulkActions(false);
		this.setHideComposeFromLine(false);
		this.setHideThreadCollapseButtons(false);
		this.setHideComposeFieldLabels(false);
		this.setCompactComposePanel(false);
		this.setHideOutboxUnlessFailed(false);
		this.setHideListActiveIndicator(false);
		this.setCompactListRows(false);
		this.setHideMailShortcutsHelp(false);
		this.setHideMoveMenuLabels(false);
		this.setIconOnlyComposeAttach(false);
		this.setCompactReaderHeader(false);
		this.setCompactReaderBody(false);
		this.setMinimalLoadingStates(false);
		this.setHideConnectingScreen(false);
		this.setCompactToolSwitcher(false);
		this.setHideSearchDropdownHeaders(false);
		this.setHidePaneBorders(false);
		this.setHideListRowDividers(false);
		this.setHideReaderPaneBorders(false);
		this.setCompactBulkToolbar(false);
		this.setHideSearchListPrefix(false);
		this.setCompactMobileSearch(false);
		this.setHideAccountFieldHints(false);
		this.setCompactQuickReply(false);
		this.setHideComposePanelBorders(false);
		this.setIconOnlyComposeDiscard(false);
		this.setCompactComposeAttachments(false);
		this.setHideActionToasts(false);
		this.setCompactSidebarShortcuts(false);
		this.setCompactToasts(false);
		this.setCompactLoadMore(false);
		this.setCompactUserMenuDropdown(false);
		this.setCompactOutboxMenu(false);
		this.setCompactSettingsRows(false);
		this.setCompactSettingsLayout(false);
		this.setCompactSettingsPanel(false);
		this.setCompactMoveMenu(false);
		this.setCompactSearchDropdown(false);
		this.setCompactComposeSuggestions(false);
		this.setCompactOfflineIndicator(false);
		this.setCompactAppHeader(false);
		this.setCompactEmptyReader(false);
		this.setCompactSettingsNav(false);
		this.setCompactExternalContentBanner(false);
		this.setCompactContactsPage(false);
		this.setCompactContactsList(false);
		this.setHideContactMessageCounts(false);
		this.setRememberLastMailbox(false);
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
		this.setSubjectOnlyList(true);
		this.setHideSidebarShortcuts(true);
		this.setHideHeaderSearch(true);
		this.setHideOfflineIndicator(true);
		this.setShowBulkSelect(false);
		this.setHideComposeHints(true);
		this.setShowComposeContactSuggestions(false);
		this.setShowSearchContactSuggestions(false);
		this.setShowCcBccInCompose(false);
		this.setReduceMotion(true);
		this.setCompactHeaderActions(true);
		this.setHideAppTitle(true);
		this.setCompactUserMenu(true);
		this.setHideListEmptyHints(true);
		this.setHideSelectionHints(true);
		this.setHideReaderTimestamps(true);
		this.setHideCollapsedThreadPreviews(true);
		this.setHideSettingsNavHints(true);
		this.setCompactFolderSidebar(true);
		this.setCompactAttachments(true);
		this.setHideReaderSenderEmail(true);
		this.setIconOnlyBulkActions(true);
		this.setHideComposeFromLine(true);
		this.setHideThreadCollapseButtons(true);
		this.setHideComposeFieldLabels(true);
		this.setCompactComposePanel(true);
		this.setHideOutboxUnlessFailed(true);
		this.setHideListActiveIndicator(true);
		this.setCompactListRows(true);
		this.setHideMailShortcutsHelp(true);
		this.setHideMoveMenuLabels(true);
		this.setIconOnlyComposeAttach(true);
		this.setCompactReaderHeader(true);
		this.setCompactReaderBody(true);
		this.setMinimalLoadingStates(true);
		this.setHideConnectingScreen(true);
		this.setCompactToolSwitcher(true);
		this.setHideSearchDropdownHeaders(true);
		this.setHidePaneBorders(true);
		this.setHideListRowDividers(true);
		this.setHideReaderPaneBorders(true);
		this.setCompactBulkToolbar(true);
		this.setHideSearchListPrefix(true);
		this.setCompactMobileSearch(true);
		this.setHideAccountFieldHints(true);
		this.setCompactQuickReply(true);
		this.setHideComposePanelBorders(true);
		this.setIconOnlyComposeDiscard(true);
		this.setCompactComposeAttachments(true);
		this.setHideActionToasts(true);
		this.setCompactSidebarShortcuts(true);
		this.setCompactToasts(true);
		this.setCompactLoadMore(true);
		this.setCompactUserMenuDropdown(true);
		this.setCompactOutboxMenu(true);
		this.setCompactSettingsRows(true);
		this.setCompactSettingsLayout(true);
		this.setCompactSettingsPanel(true);
		this.setCompactMoveMenu(true);
		this.setCompactSearchDropdown(true);
		this.setCompactComposeSuggestions(true);
		this.setCompactOfflineIndicator(true);
		this.setCompactAppHeader(true);
		this.setCompactEmptyReader(true);
		this.setCompactSettingsNav(true);
		this.setCompactExternalContentBanner(true);
		this.setCompactContactsPage(true);
		this.setCompactContactsList(true);
		this.setHideContactMessageCounts(true);
		this.setRememberLastMailbox(true);
		this.setMinimalReaderToolbar(true);
		this.setExpandListUntilOpen(true);
		this.setHighlightUnreadInList(false);
		this.setCompactLayout(true);
		this.setShowReaderContactActions(false);
		this.setShowQuickReply(false);
		this.setHideReaderRecipients(true);
		this.setToolIconsOnly(true);
		this.setCollapseQuotedInCompose(true);
		this.setHideEmptyReaderPrompts(true);
		this.setHideThreadSummary(true);
		this.setHideFolderSidebarHeader(true);
		this.setHideFolderIcons(true);
		this.setHideListHeader(true);
		this.setAutoLoadMore(true);
	}

	resetMailSettings() {
		this.setNotifyOnNewMail(true);
		this.setShowUnreadInTitle(true);
		this.setMarkAsReadOnOpen(true);
		this.setEnableKeyboardShortcuts(true);
		this.setConfirmBeforeDelete(true);
		this.setConfirmBeforeDiscardCompose(true);
		this.setReturnToInboxAfterSend(false);
		this.setHideMailShortcutsHelp(false);
		this.setHideActionToasts(false);
	}

	simplificationCount(): number {
		const flags = [
			!this.showAvatars,
			!this.showListPreview,
			this.subjectOnlyList,
			!this.showStarsInList,
			!this.showAttachmentIcons,
			!this.showMessageCounts,
			!this.showListTimestamps,
			!this.highlightUnreadInList,
			!this.showBulkSelect,
			this.expandListUntilOpen,
			this.compactLayout,
			this.hideSidebarShortcuts,
			this.mailOnlyNavigation,
			this.skipHomeScreen,
			this.hideHeaderSearch,
			this.hideOfflineIndicator,
			this.hideComposeHints,
			!this.showComposeContactSuggestions,
			!this.showSearchContactSuggestions,
			!this.showCcBccInCompose,
			this.minimalReaderToolbar,
			this.hideReaderRecipients,
			this.hideThreadSummary,
			this.hideEmptyReaderPrompts,
			this.hideFolderSidebarHeader,
			this.hideFolderIcons,
			this.hideListHeader,
			this.toolIconsOnly,
			this.hideExternalContentBanner,
			this.preferPlainText,
			this.autoLoadMore,
			!this.showFolderUnreadCounts,
			!this.showQuickReply,
			!this.showReaderContactActions,
			this.reduceMotion,
			this.compactHeaderActions,
			this.hideAppTitle,
			this.compactUserMenu,
			this.hideListEmptyHints,
			this.hideSelectionHints,
			this.hideReaderTimestamps,
			this.hideCollapsedThreadPreviews,
			this.hideSettingsNavHints,
			this.compactFolderSidebar,
			this.compactAttachments,
			this.hideReaderSenderEmail,
			this.iconOnlyBulkActions,
			this.hideComposeFromLine,
			this.hideThreadCollapseButtons,
			this.hideComposeFieldLabels,
			this.compactComposePanel,
			this.hideOutboxUnlessFailed,
			this.hideListActiveIndicator,
			this.compactListRows,
			this.hideMailShortcutsHelp,
			this.hideMoveMenuLabels,
			this.iconOnlyComposeAttach,
			this.compactReaderHeader,
			this.compactReaderBody,
			this.minimalLoadingStates,
			this.hideConnectingScreen,
			this.compactToolSwitcher,
			this.hideSearchDropdownHeaders,
			this.hidePaneBorders,
			this.hideListRowDividers,
			this.hideReaderPaneBorders,
			this.compactBulkToolbar,
			this.hideSearchListPrefix,
			this.compactMobileSearch,
			this.hideAccountFieldHints,
			this.compactQuickReply,
			this.hideComposePanelBorders,
			this.iconOnlyComposeDiscard,
			this.compactComposeAttachments,
			this.hideActionToasts,
			this.compactSidebarShortcuts,
			this.compactToasts,
			this.compactLoadMore,
			this.compactUserMenuDropdown,
			this.compactOutboxMenu,
			this.compactSettingsRows,
			this.compactSettingsLayout,
			this.compactSettingsPanel,
			this.compactMoveMenu,
			this.compactSearchDropdown,
			this.compactComposeSuggestions,
			this.compactOfflineIndicator,
			this.compactAppHeader,
			this.compactEmptyReader,
			this.compactSettingsNav,
			this.compactExternalContentBanner,
			this.compactContactsPage,
			this.compactContactsList,
			this.hideContactMessageCounts,
			this.rememberLastMailbox
		];
		return flags.filter(Boolean).length;
	}

	exportLocalPreferences(): string {
		if (!browser) return '{}';

		const data: Record<string, string> = {};
		for (let index = 0; index < localStorage.length; index++) {
			const key = localStorage.key(index);
			if (!key || (!key.startsWith('zaur:') && key !== 'zaur-theme')) continue;
			const value = localStorage.getItem(key);
			if (value !== null) data[key] = value;
		}

		return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), settings: data }, null, 2);
	}

	importLocalPreferences(json: string): { ok: true } | { ok: false; error: string } {
		if (!browser) return { ok: false, error: 'Import is only available in the browser.' };

		try {
			const parsed = JSON.parse(json) as { settings?: Record<string, unknown> } | Record<string, unknown>;
			const data = ('settings' in parsed && parsed.settings ? parsed.settings : parsed) as Record<
				string,
				unknown
			>;

			if (typeof data !== 'object' || data === null || Array.isArray(data)) {
				return { ok: false, error: 'Invalid settings file format.' };
			}

			for (const [key, value] of Object.entries(data)) {
				if (typeof value !== 'string') continue;
				if (!key.startsWith('zaur:') && key !== 'zaur-theme') continue;
				localStorage.setItem(key, value);
			}

			this.init();
			void import('$lib/stores/theme.svelte').then(({ theme }) => theme.init());
			return { ok: true };
		} catch {
			return { ok: false, error: 'Could not parse the settings file.' };
		}
	}

	downloadLocalPreferences() {
		if (!browser) return;

		const blob = new Blob([this.exportLocalPreferences()], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `zaur-webmail-settings-${new Date().toISOString().slice(0, 10)}.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	private applyReduceMotion() {
		if (!browser) return;
		document.documentElement.classList.toggle('z-reduce-motion', this.reduceMotion);
	}

	private applyLayoutWidth() {
		if (!browser) return;
		document.documentElement.style.setProperty('--width-sidebar', this.compactLayout ? '12rem' : '15rem');
		document.documentElement.style.setProperty('--width-list', this.compactLayout ? '18rem' : '22rem');
	}

	private applyHeaderLayout() {
		if (!browser) return;
		document.documentElement.style.setProperty('--height-header', this.compactAppHeader ? '2.75rem' : '3.25rem');
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
