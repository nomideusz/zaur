import { browser } from '$app/environment';
import {
	collectSyncableSettings,
	pullAccountSettings,
	pushAccountSettingsNow,
	scheduleAccountSettingsPush,
	setSyncAccountEmail,
	isOtherAccountsScopedKey
} from '$lib/settings/account-sync';
import { accountSettingsSyncAtKey } from '$lib/settings/account-settings-types';
import type { SettingsDetailLevel } from '$lib/settings/detail-level';
import { toast } from '$lib/stores/toast.svelte';
import {
	requestBrowserNotificationPermission,
	syncPushSubscription
} from '$lib/utils/notifications';

export type ListDensity = 'comfortable' | 'compact';
export type ReaderTextSize = 'small' | 'normal' | 'large';
export type CalendarMaxEventsPerDay = 2 | 3 | 5;
export type LoadingIndicatorStyle = 'skeleton' | 'minimal' | 'spinner';
export type ComposeLayout = 'drawer' | 'pane';
export type ComposeDrawerWidth = 'narrow' | 'default' | 'wide';
export type DefaultReplyMode = 'reply' | 'reply-all';
export type ListTextSize = 'small' | 'normal' | 'large';
export type ComposeFormat = 'plain' | 'html';

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
	hideEmptyReaderDescription: 'zaur:hide-empty-reader-description',
	hideEmptyReaderActions: 'zaur:hide-empty-reader-actions',
	hideEmptyReaderIcon: 'zaur:hide-empty-reader-icon',
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
	hideListEmptyActions: 'zaur:hide-list-empty-actions',
	hideSelectionHints: 'zaur:hide-selection-hints',
	hideReaderTimestamps: 'zaur:hide-reader-timestamps',
	hideCollapsedThreadPreviews: 'zaur:hide-collapsed-thread-previews',
	hideSettingsNavHints: 'zaur:hide-settings-nav-hints',
	hideSettingsPanelDescriptions: 'zaur:hide-settings-panel-descriptions',
	compactFolderSidebar: 'zaur:compact-folder-sidebar',
	compactAttachments: 'zaur:compact-attachments',
	hideReaderSenderEmail: 'zaur:hide-reader-sender-email',
	hideComposeFromLine: 'zaur:hide-compose-from-line',
	hideComposeFieldLabels: 'zaur:hide-compose-field-labels',
	composeDrawerWidth: 'zaur:compose-drawer-width',
	composeLayout: 'zaur:compose-layout',
	hideOutboxUnlessFailed: 'zaur:hide-outbox-unless-failed',
	hideListActiveIndicator: 'zaur:hide-list-active-indicator',
	compactListRows: 'zaur:compact-list-rows',
	hideMailShortcutsHelp: 'zaur:hide-mail-shortcuts-help',
	hideMoveMenuLabels: 'zaur:hide-move-menu-labels',
	iconOnlyComposeAttach: 'zaur:icon-only-compose-attach',
	compactReaderHeader: 'zaur:compact-reader-header',
	compactReaderBody: 'zaur:compact-reader-body',
	minimalLoadingStates: 'zaur:minimal-loading-states',
	loadingIndicatorStyle: 'zaur:loading-indicator-style',
	hideConnectingScreen: 'zaur:hide-connecting-screen',
	compactToolSwitcher: 'zaur:compact-tool-switcher',
	hideSearchDropdownHeaders: 'zaur:hide-search-dropdown-headers',
	hidePaneBorders: 'zaur:hide-pane-borders',
	hideListRowDividers: 'zaur:hide-list-row-dividers',
	hideReaderPaneBorders: 'zaur:hide-reader-pane-borders',
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
	hideToastIcons: 'zaur:hide-toast-icons',
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
	hideSettingsBackLink: 'zaur:hide-settings-back-link',
	hideSettingsPageTitle: 'zaur:hide-settings-page-title',
	hideReaderStatusBackButton: 'zaur:hide-reader-status-back-button',
	hideReaderStatusMessage: 'zaur:hide-reader-status-message',
	compactExternalContentBanner: 'zaur:compact-external-content-banner',
	compactContactsPage: 'zaur:compact-contacts-page',
	compactContactsList: 'zaur:compact-contacts-list',
	hideContactMessageCounts: 'zaur:hide-contact-message-counts',
	compactListEmptyState: 'zaur:compact-list-empty-state',
	compactListHeader: 'zaur:compact-list-header',
	compactHomeScreen: 'zaur:compact-home-screen',
	hideHomeScreenSubtitle: 'zaur:hide-home-screen-subtitle',
	hideHomeCardDescriptions: 'zaur:hide-home-card-descriptions',
	hideHomeOpenInboxButton: 'zaur:hide-home-open-inbox-button',
	compactListLoadingSkeleton: 'zaur:compact-list-loading-skeleton',
	compactMobileFolderPicker: 'zaur:compact-mobile-folder-picker',
	compactReaderToolbar: 'zaur:compact-reader-toolbar',
	compactListAvatars: 'zaur:compact-list-avatars',
	compactReaderAvatars: 'zaur:compact-reader-avatars',
	compactCollapsedThreads: 'zaur:compact-collapsed-threads',
	compactReaderStatus: 'zaur:compact-reader-status',
	compactListErrorState: 'zaur:compact-list-error-state',
	hideListErrorRetry: 'zaur:hide-list-error-retry',
	compactReaderSkeleton: 'zaur:compact-reader-skeleton',
	compactFolderBadges: 'zaur:compact-folder-badges',
	compactFolderTree: 'zaur:compact-folder-tree',
	compactFolderSidebarHeader: 'zaur:compact-folder-sidebar-header',
	compactFolderLoadingSkeleton: 'zaur:compact-folder-loading-skeleton',
	hideContactGroupLetters: 'zaur:hide-contact-group-letters',
	compactFolderSidebarError: 'zaur:compact-folder-sidebar-error',
	compactContactsAddForm: 'zaur:compact-contacts-add-form',
	hideContactsPageSubtitle: 'zaur:hide-contacts-page-subtitle',
	compactContactsSearch: 'zaur:compact-contacts-search',
	compactContactsEmptyState: 'zaur:compact-contacts-empty-state',
	hideContactsHeaderSettings: 'zaur:hide-contacts-header-settings',
	hideContactsComposeButton: 'zaur:hide-contacts-compose-button',
	hideContactsEmptyHints: 'zaur:hide-contacts-empty-hints',
	hideContactsEmptyActions: 'zaur:hide-contacts-empty-actions',
	hideContactsHoverActions: 'zaur:hide-contacts-hover-actions',
	hideContactsRowMailIcon: 'zaur:hide-contacts-row-mail-icon',
	hideContactsEmailLine: 'zaur:hide-contacts-email-line',
	compactCalendarGrid: 'zaur:compact-calendar-grid',
	compactCalendarHeader: 'zaur:compact-calendar-header',
	compactCalendarSidebar: 'zaur:compact-calendar-sidebar',
	calendarWeekStartsOnMonday: 'zaur:calendar-week-starts-on-monday',
	hideCalendarEventTimes: 'zaur:hide-calendar-event-times',
	calendarMaxEventsPerDay: 'zaur:calendar-max-events-per-day',
	hideCalendarMoreEventsLabel: 'zaur:hide-calendar-more-events-label',
	hideCalendarSidebarHeader: 'zaur:hide-calendar-sidebar-header',
	hideCalendarSidebarSettings: 'zaur:hide-calendar-sidebar-settings',
	hideCalendarNewEventButton: 'zaur:hide-calendar-new-event-button',
	iconOnlyCalendarNewEvent: 'zaur:icon-only-calendar-new-event',
	compactCalendarEventPanel: 'zaur:compact-calendar-event-panel',
	hideCalendarEmptyEventPanel: 'zaur:hide-calendar-empty-event-panel',
	compactCalendarEmptyEventPanel: 'zaur:compact-calendar-empty-event-panel',
	compactCalendarCompose: 'zaur:compact-calendar-compose',
	hideCalendarComposeFieldLabels: 'zaur:hide-calendar-compose-field-labels',
	hideCalendarPaneBorders: 'zaur:hide-calendar-pane-borders',
	compactReaderInlineError: 'zaur:compact-reader-inline-error',
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
	enableUndoSend: 'zaur:enable-undo-send',
	skipHomeScreen: 'zaur:skip-home-screen',
	readerTextSize: 'zaur:reader-text-size',
	listTextSize: 'zaur:list-text-size',
	defaultReplyMode: 'zaur:default-reply-mode',
	defaultComposeFormat: 'zaur:default-compose-format',
	useSignature: (email: string) => `zaur:use-signature:${email}`,
	markAsReadOnOpen: 'zaur:mark-read-on-open',
	showUnreadInTitle: 'zaur:show-unread-in-title',
	showUnreadAppBadge: 'zaur:show-unread-app-badge',
	notifyOnNewMail: 'zaur:notify-new-mail',
	displayName: (email: string) => `zaur:display-name:${email}`,
	signature: (email: string) => `zaur:signature:${email}`,
	settingsDetailLevel: 'zaur:settings-detail-level'
} as const;

const LIST_ROW_HEIGHT: Record<ListDensity, { preview: string; noPreview: string }> = {
	comfortable: { preview: '4.25rem', noPreview: '3.25rem' },
	compact: { preview: '3rem', noPreview: '2.75rem' }
};

const READER_TEXT_SIZE: Record<ReaderTextSize, string> = {
	small: '0.8125rem',
	normal: '0.875rem',
	large: '1rem'
};

const READER_MEASURE: Record<ReaderTextSize, string> = {
	small: '40rem',
	normal: '42rem',
	large: '48rem'
};

const LIST_TEXT_SIZE: Record<ListTextSize, string> = {
	small: '0.75rem',
	normal: '0.875rem',
	large: '1rem'
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

function readHideEmptyReaderDescription(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideEmptyReaderDescription) === 'true';
}

function readHideEmptyReaderActions(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideEmptyReaderActions) === 'true';
}

function readHideEmptyReaderIcon(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideEmptyReaderIcon) === 'true';
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

function readHideListEmptyActions(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideListEmptyActions) === 'true';
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

function readHideSettingsPanelDescriptions(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideSettingsPanelDescriptions) === 'true';
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

function readHideComposeFromLine(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideComposeFromLine) === 'true';
}

function readHideComposeFieldLabels(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideComposeFieldLabels) === 'true';
}

function readComposeDrawerWidth(): ComposeDrawerWidth {
	if (!browser) return 'default';
	const stored = localStorage.getItem(STORAGE.composeDrawerWidth);
	if (stored === 'narrow' || stored === 'wide') return stored;
	if (stored === 'default') return 'default';
	if (localStorage.getItem('zaur:compact-compose-panel') === 'true') return 'narrow';
	return 'default';
}

function readComposeLayout(): ComposeLayout {
	if (!browser) return 'drawer';
	const value = localStorage.getItem(STORAGE.composeLayout);
	return value === 'pane' ? 'pane' : 'drawer';
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

function readLoadingIndicatorStyle(): LoadingIndicatorStyle {
	if (!browser) return 'skeleton';

	const value = localStorage.getItem(STORAGE.loadingIndicatorStyle);
	if (value === 'minimal' || value === 'spinner' || value === 'skeleton') {
		return value;
	}

	if (localStorage.getItem(STORAGE.minimalLoadingStates) === 'true') {
		return 'minimal';
	}

	return 'skeleton';
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

function readHideToastIcons(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideToastIcons) === 'true';
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

function readSettingsDetailLevel(): SettingsDetailLevel {
	if (!browser) return 'basic';
	const stored = localStorage.getItem(STORAGE.settingsDetailLevel);
	return stored === 'advanced' ? 'advanced' : 'basic';
}

function readCompactSettingsNav(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactSettingsNav) === 'true';
}

function readHideSettingsBackLink(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideSettingsBackLink) === 'true';
}

function readHideSettingsPageTitle(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideSettingsPageTitle) === 'true';
}

function readHideReaderStatusBackButton(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideReaderStatusBackButton) === 'true';
}

function readHideReaderStatusMessage(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideReaderStatusMessage) === 'true';
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

function readCompactListEmptyState(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactListEmptyState) === 'true';
}

function readCompactListHeader(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactListHeader) === 'true';
}

function readCompactHomeScreen(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactHomeScreen) === 'true';
}

function readHideHomeScreenSubtitle(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideHomeScreenSubtitle) === 'true';
}

function readHideHomeCardDescriptions(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideHomeCardDescriptions) === 'true';
}

function readHideHomeOpenInboxButton(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideHomeOpenInboxButton) === 'true';
}

function readCompactListLoadingSkeleton(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactListLoadingSkeleton) === 'true';
}

function readCompactMobileFolderPicker(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactMobileFolderPicker) === 'true';
}

function readCompactReaderToolbar(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactReaderToolbar) === 'true';
}

function readCompactListAvatars(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactListAvatars) === 'true';
}

function readCompactReaderAvatars(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactReaderAvatars) === 'true';
}

function readCompactCollapsedThreads(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactCollapsedThreads) === 'true';
}

function readCompactReaderStatus(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactReaderStatus) === 'true';
}

function readCompactListErrorState(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactListErrorState) === 'true';
}

function readHideListErrorRetry(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideListErrorRetry) === 'true';
}

function readCompactReaderSkeleton(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactReaderSkeleton) === 'true';
}

function readCompactFolderBadges(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactFolderBadges) === 'true';
}

function readCompactFolderTree(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactFolderTree) === 'true';
}

function readCompactFolderSidebarHeader(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactFolderSidebarHeader) === 'true';
}

function readCompactFolderLoadingSkeleton(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactFolderLoadingSkeleton) === 'true';
}

function readHideContactGroupLetters(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideContactGroupLetters) === 'true';
}

function readCompactFolderSidebarError(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactFolderSidebarError) === 'true';
}

function readCompactContactsAddForm(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactContactsAddForm) === 'true';
}

function readHideContactsPageSubtitle(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideContactsPageSubtitle) === 'true';
}

function readCompactContactsSearch(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactContactsSearch) === 'true';
}

function readCompactContactsEmptyState(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactContactsEmptyState) === 'true';
}

function readHideContactsHeaderSettings(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideContactsHeaderSettings) === 'true';
}

function readHideContactsComposeButton(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideContactsComposeButton) === 'true';
}

function readHideContactsEmptyHints(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideContactsEmptyHints) === 'true';
}

function readHideContactsEmptyActions(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideContactsEmptyActions) === 'true';
}

function readHideContactsHoverActions(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideContactsHoverActions) === 'true';
}

function readHideContactsRowMailIcon(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideContactsRowMailIcon) === 'true';
}

function readHideContactsEmailLine(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideContactsEmailLine) === 'true';
}

function readCompactCalendarGrid(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactCalendarGrid) === 'true';
}

function readCompactCalendarHeader(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactCalendarHeader) === 'true';
}

function readCompactCalendarSidebar(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactCalendarSidebar) === 'true';
}

function readCalendarWeekStartsOnMonday(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.calendarWeekStartsOnMonday) === 'true';
}

function readHideCalendarEventTimes(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideCalendarEventTimes) === 'true';
}

function readCalendarMaxEventsPerDay(): CalendarMaxEventsPerDay {
	if (!browser) return 3;
	const value = localStorage.getItem(STORAGE.calendarMaxEventsPerDay);
	if (value === '2' || value === '5') return Number(value) as CalendarMaxEventsPerDay;
	return 3;
}

function readHideCalendarMoreEventsLabel(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideCalendarMoreEventsLabel) === 'true';
}

function readHideCalendarSidebarHeader(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideCalendarSidebarHeader) === 'true';
}

function readHideCalendarSidebarSettings(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideCalendarSidebarSettings) === 'true';
}

function readHideCalendarNewEventButton(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideCalendarNewEventButton) === 'true';
}

function readIconOnlyCalendarNewEvent(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.iconOnlyCalendarNewEvent) === 'true';
}

function readCompactCalendarEventPanel(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactCalendarEventPanel) === 'true';
}

function readHideCalendarEmptyEventPanel(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideCalendarEmptyEventPanel) === 'true';
}

function readCompactCalendarEmptyEventPanel(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactCalendarEmptyEventPanel) === 'true';
}

function readCompactCalendarCompose(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactCalendarCompose) === 'true';
}

function readHideCalendarComposeFieldLabels(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideCalendarComposeFieldLabels) === 'true';
}

function readHideCalendarPaneBorders(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.hideCalendarPaneBorders) === 'true';
}

function readCompactReaderInlineError(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.compactReaderInlineError) === 'true';
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

function readEnableUndoSend(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.enableUndoSend) !== 'false';
}

function readSkipHomeScreen(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE.skipHomeScreen) === 'true';
}

function readStoredTextSize(key: string): 'small' | 'normal' | 'large' {
	if (!browser) return 'normal';
	const stored = localStorage.getItem(key);
	if (stored === 'small' || stored === 'large') return stored;
	return 'normal';
}

function readReaderTextSize(): ReaderTextSize {
	return readStoredTextSize(STORAGE.readerTextSize);
}

function readListTextSize(): ListTextSize {
	return readStoredTextSize(STORAGE.listTextSize);
}

function readDefaultReplyMode(): DefaultReplyMode {
	if (!browser) return 'reply';
	return localStorage.getItem(STORAGE.defaultReplyMode) === 'reply-all' ? 'reply-all' : 'reply';
}

function readDefaultComposeFormat(): ComposeFormat {
	if (!browser) return 'plain';
	return localStorage.getItem(STORAGE.defaultComposeFormat) === 'html' ? 'html' : 'plain';
}

function readUseSignature(email: string | null): boolean {
	if (!browser || !email) return true;
	return localStorage.getItem(STORAGE.useSignature(email)) !== 'false';
}

function readMarkAsReadOnOpen(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.markAsReadOnOpen) !== 'false';
}

function readShowUnreadInTitle(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showUnreadInTitle) !== 'false';
}

function readShowUnreadAppBadge(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.showUnreadAppBadge) !== 'false';
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
	hideEmptyReaderDescription = $state(readHideEmptyReaderDescription());
	hideEmptyReaderActions = $state(readHideEmptyReaderActions());
	hideEmptyReaderIcon = $state(readHideEmptyReaderIcon());
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
	hideListEmptyActions = $state(readHideListEmptyActions());
	hideSelectionHints = $state(readHideSelectionHints());
	hideReaderTimestamps = $state(readHideReaderTimestamps());
	hideCollapsedThreadPreviews = $state(readHideCollapsedThreadPreviews());
	hideSettingsNavHints = $state(readHideSettingsNavHints());
	hideSettingsPanelDescriptions = $state(readHideSettingsPanelDescriptions());
	compactFolderSidebar = $state(readCompactFolderSidebar());
	compactAttachments = $state(readCompactAttachments());
	hideReaderSenderEmail = $state(readHideReaderSenderEmail());
	hideComposeFromLine = $state(readHideComposeFromLine());
	hideComposeFieldLabels = $state(readHideComposeFieldLabels());
	composeDrawerWidth = $state<ComposeDrawerWidth>(readComposeDrawerWidth());
	composeLayout = $state<ComposeLayout>(readComposeLayout());
	hideOutboxUnlessFailed = $state(readHideOutboxUnlessFailed());
	hideListActiveIndicator = $state(readHideListActiveIndicator());
	compactListRows = $state(readCompactListRows());
	hideMailShortcutsHelp = $state(readHideMailShortcutsHelp());
	hideMoveMenuLabels = $state(readHideMoveMenuLabels());
	iconOnlyComposeAttach = $state(readIconOnlyComposeAttach());
	compactReaderHeader = $state(readCompactReaderHeader());
	compactReaderBody = $state(readCompactReaderBody());
	loadingIndicatorStyle = $state<LoadingIndicatorStyle>(readLoadingIndicatorStyle());
	hideConnectingScreen = $state(readHideConnectingScreen());
	compactToolSwitcher = $state(readCompactToolSwitcher());
	hideSearchDropdownHeaders = $state(readHideSearchDropdownHeaders());
	hidePaneBorders = $state(readHidePaneBorders());
	hideListRowDividers = $state(readHideListRowDividers());
	hideReaderPaneBorders = $state(readHideReaderPaneBorders());
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
	hideToastIcons = $state(readHideToastIcons());
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
	settingsDetailLevel = $state(readSettingsDetailLevel());
	hideSettingsBackLink = $state(readHideSettingsBackLink());
	hideSettingsPageTitle = $state(readHideSettingsPageTitle());
	hideReaderStatusBackButton = $state(readHideReaderStatusBackButton());
	hideReaderStatusMessage = $state(readHideReaderStatusMessage());
	compactExternalContentBanner = $state(readCompactExternalContentBanner());
	compactContactsPage = $state(readCompactContactsPage());
	compactContactsList = $state(readCompactContactsList());
	hideContactMessageCounts = $state(readHideContactMessageCounts());
	compactListEmptyState = $state(readCompactListEmptyState());
	compactListHeader = $state(readCompactListHeader());
	compactHomeScreen = $state(readCompactHomeScreen());
	hideHomeScreenSubtitle = $state(readHideHomeScreenSubtitle());
	hideHomeCardDescriptions = $state(readHideHomeCardDescriptions());
	hideHomeOpenInboxButton = $state(readHideHomeOpenInboxButton());
	compactListLoadingSkeleton = $state(readCompactListLoadingSkeleton());
	compactMobileFolderPicker = $state(readCompactMobileFolderPicker());
	compactReaderToolbar = $state(readCompactReaderToolbar());
	compactListAvatars = $state(readCompactListAvatars());
	compactReaderAvatars = $state(readCompactReaderAvatars());
	compactCollapsedThreads = $state(readCompactCollapsedThreads());
	compactReaderStatus = $state(readCompactReaderStatus());
	compactListErrorState = $state(readCompactListErrorState());
	hideListErrorRetry = $state(readHideListErrorRetry());
	compactReaderSkeleton = $state(readCompactReaderSkeleton());
	compactFolderBadges = $state(readCompactFolderBadges());
	compactFolderTree = $state(readCompactFolderTree());
	compactFolderSidebarHeader = $state(readCompactFolderSidebarHeader());
	compactFolderLoadingSkeleton = $state(readCompactFolderLoadingSkeleton());
	hideContactGroupLetters = $state(readHideContactGroupLetters());
	compactFolderSidebarError = $state(readCompactFolderSidebarError());
	compactContactsAddForm = $state(readCompactContactsAddForm());
	hideContactsPageSubtitle = $state(readHideContactsPageSubtitle());
	compactContactsSearch = $state(readCompactContactsSearch());
	compactContactsEmptyState = $state(readCompactContactsEmptyState());
	hideContactsHeaderSettings = $state(readHideContactsHeaderSettings());
	hideContactsComposeButton = $state(readHideContactsComposeButton());
	hideContactsEmptyHints = $state(readHideContactsEmptyHints());
	hideContactsEmptyActions = $state(readHideContactsEmptyActions());
	hideContactsHoverActions = $state(readHideContactsHoverActions());
	hideContactsRowMailIcon = $state(readHideContactsRowMailIcon());
	hideContactsEmailLine = $state(readHideContactsEmailLine());
	compactCalendarGrid = $state(readCompactCalendarGrid());
	compactCalendarHeader = $state(readCompactCalendarHeader());
	compactCalendarSidebar = $state(readCompactCalendarSidebar());
	calendarWeekStartsOnMonday = $state(readCalendarWeekStartsOnMonday());
	hideCalendarEventTimes = $state(readHideCalendarEventTimes());
	calendarMaxEventsPerDay = $state<CalendarMaxEventsPerDay>(readCalendarMaxEventsPerDay());
	hideCalendarMoreEventsLabel = $state(readHideCalendarMoreEventsLabel());
	hideCalendarSidebarHeader = $state(readHideCalendarSidebarHeader());
	hideCalendarSidebarSettings = $state(readHideCalendarSidebarSettings());
	hideCalendarNewEventButton = $state(readHideCalendarNewEventButton());
	iconOnlyCalendarNewEvent = $state(readIconOnlyCalendarNewEvent());
	compactCalendarEventPanel = $state(readCompactCalendarEventPanel());
	hideCalendarEmptyEventPanel = $state(readHideCalendarEmptyEventPanel());
	compactCalendarEmptyEventPanel = $state(readCompactCalendarEmptyEventPanel());
	compactCalendarCompose = $state(readCompactCalendarCompose());
	hideCalendarComposeFieldLabels = $state(readHideCalendarComposeFieldLabels());
	hideCalendarPaneBorders = $state(readHideCalendarPaneBorders());
	compactReaderInlineError = $state(readCompactReaderInlineError());
	rememberLastMailbox = $state(readRememberLastMailbox());
	minimalReaderToolbar = $state(readMinimalReaderToolbar());
	hideSidebarShortcuts = $state(readHideSidebarShortcuts());
	expandListUntilOpen = $state(readExpandListUntilOpen());
	mailOnlyNavigation = $state(readMailOnlyNavigation());
	enableKeyboardShortcuts = $state(readEnableKeyboardShortcuts());
	confirmBeforeDelete = $state(readConfirmBeforeDelete());
	confirmBeforeDiscardCompose = $state(readConfirmBeforeDiscardCompose());
	returnToInboxAfterSend = $state(readReturnToInboxAfterSend());
	enableUndoSend = $state(readEnableUndoSend());
	skipHomeScreen = $state(readSkipHomeScreen());
	readerTextSize = $state<ReaderTextSize>(readReaderTextSize());
	listTextSize = $state<ListTextSize>(readListTextSize());
	defaultReplyMode = $state<DefaultReplyMode>(readDefaultReplyMode());
	defaultComposeFormat = $state<ComposeFormat>(readDefaultComposeFormat());
	markAsReadOnOpen = $state(readMarkAsReadOnOpen());
	showUnreadInTitle = $state(readShowUnreadInTitle());
	showUnreadAppBadge = $state(readShowUnreadAppBadge());
	notifyOnNewMail = $state(readNotifyOnNewMail());
	displayName = $state('');
	signature = $state('');
	useSignature = $state(true);

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
		this.hideEmptyReaderDescription = readHideEmptyReaderDescription();
		this.hideEmptyReaderActions = readHideEmptyReaderActions();
		this.hideEmptyReaderIcon = readHideEmptyReaderIcon();
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
		this.hideListEmptyActions = readHideListEmptyActions();
		this.hideSelectionHints = readHideSelectionHints();
		this.hideReaderTimestamps = readHideReaderTimestamps();
		this.hideCollapsedThreadPreviews = readHideCollapsedThreadPreviews();
		this.hideSettingsNavHints = readHideSettingsNavHints();
		this.hideSettingsPanelDescriptions = readHideSettingsPanelDescriptions();
		this.compactFolderSidebar = readCompactFolderSidebar();
		this.compactAttachments = readCompactAttachments();
		this.hideReaderSenderEmail = readHideReaderSenderEmail();
		this.hideComposeFromLine = readHideComposeFromLine();
		this.hideComposeFieldLabels = readHideComposeFieldLabels();
		this.composeDrawerWidth = readComposeDrawerWidth();
		this.composeLayout = readComposeLayout();
		this.hideOutboxUnlessFailed = readHideOutboxUnlessFailed();
		this.hideListActiveIndicator = readHideListActiveIndicator();
		this.compactListRows = readCompactListRows();
		this.hideMailShortcutsHelp = readHideMailShortcutsHelp();
		this.hideMoveMenuLabels = readHideMoveMenuLabels();
		this.iconOnlyComposeAttach = readIconOnlyComposeAttach();
		this.compactReaderHeader = readCompactReaderHeader();
		this.compactReaderBody = readCompactReaderBody();
		this.loadingIndicatorStyle = readLoadingIndicatorStyle();
		this.hideConnectingScreen = readHideConnectingScreen();
		this.compactToolSwitcher = readCompactToolSwitcher();
		this.hideSearchDropdownHeaders = readHideSearchDropdownHeaders();
		this.hidePaneBorders = readHidePaneBorders();
		this.hideListRowDividers = readHideListRowDividers();
		this.hideReaderPaneBorders = readHideReaderPaneBorders();
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
		this.hideToastIcons = readHideToastIcons();
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
		this.settingsDetailLevel = readSettingsDetailLevel();
		this.hideSettingsBackLink = readHideSettingsBackLink();
		this.hideSettingsPageTitle = readHideSettingsPageTitle();
		this.hideReaderStatusBackButton = readHideReaderStatusBackButton();
		this.hideReaderStatusMessage = readHideReaderStatusMessage();
		this.compactExternalContentBanner = readCompactExternalContentBanner();
		this.compactContactsPage = readCompactContactsPage();
		this.compactContactsList = readCompactContactsList();
		this.hideContactMessageCounts = readHideContactMessageCounts();
		this.compactListEmptyState = readCompactListEmptyState();
		this.compactListHeader = readCompactListHeader();
		this.compactHomeScreen = readCompactHomeScreen();
		this.hideHomeScreenSubtitle = readHideHomeScreenSubtitle();
		this.hideHomeCardDescriptions = readHideHomeCardDescriptions();
		this.hideHomeOpenInboxButton = readHideHomeOpenInboxButton();
		this.compactListLoadingSkeleton = readCompactListLoadingSkeleton();
		this.compactMobileFolderPicker = readCompactMobileFolderPicker();
		this.compactReaderToolbar = readCompactReaderToolbar();
		this.compactListAvatars = readCompactListAvatars();
		this.compactReaderAvatars = readCompactReaderAvatars();
		this.compactCollapsedThreads = readCompactCollapsedThreads();
		this.compactReaderStatus = readCompactReaderStatus();
		this.compactListErrorState = readCompactListErrorState();
		this.hideListErrorRetry = readHideListErrorRetry();
		this.compactReaderSkeleton = readCompactReaderSkeleton();
		this.compactFolderBadges = readCompactFolderBadges();
		this.compactFolderTree = readCompactFolderTree();
		this.compactFolderSidebarHeader = readCompactFolderSidebarHeader();
		this.compactFolderLoadingSkeleton = readCompactFolderLoadingSkeleton();
		this.hideContactGroupLetters = readHideContactGroupLetters();
		this.compactFolderSidebarError = readCompactFolderSidebarError();
		this.compactContactsAddForm = readCompactContactsAddForm();
		this.hideContactsPageSubtitle = readHideContactsPageSubtitle();
		this.compactContactsSearch = readCompactContactsSearch();
		this.compactContactsEmptyState = readCompactContactsEmptyState();
		this.hideContactsHeaderSettings = readHideContactsHeaderSettings();
		this.hideContactsComposeButton = readHideContactsComposeButton();
		this.hideContactsEmptyHints = readHideContactsEmptyHints();
		this.hideContactsEmptyActions = readHideContactsEmptyActions();
		this.hideContactsHoverActions = readHideContactsHoverActions();
		this.hideContactsRowMailIcon = readHideContactsRowMailIcon();
		this.hideContactsEmailLine = readHideContactsEmailLine();
		this.compactCalendarGrid = readCompactCalendarGrid();
		this.compactCalendarHeader = readCompactCalendarHeader();
		this.compactCalendarSidebar = readCompactCalendarSidebar();
		this.calendarWeekStartsOnMonday = readCalendarWeekStartsOnMonday();
		this.hideCalendarEventTimes = readHideCalendarEventTimes();
		this.calendarMaxEventsPerDay = readCalendarMaxEventsPerDay();
		this.hideCalendarMoreEventsLabel = readHideCalendarMoreEventsLabel();
		this.hideCalendarSidebarHeader = readHideCalendarSidebarHeader();
		this.hideCalendarSidebarSettings = readHideCalendarSidebarSettings();
		this.hideCalendarNewEventButton = readHideCalendarNewEventButton();
		this.iconOnlyCalendarNewEvent = readIconOnlyCalendarNewEvent();
		this.compactCalendarEventPanel = readCompactCalendarEventPanel();
		this.hideCalendarEmptyEventPanel = readHideCalendarEmptyEventPanel();
		this.compactCalendarEmptyEventPanel = readCompactCalendarEmptyEventPanel();
		this.compactCalendarCompose = readCompactCalendarCompose();
		this.hideCalendarComposeFieldLabels = readHideCalendarComposeFieldLabels();
		this.hideCalendarPaneBorders = readHideCalendarPaneBorders();
		this.compactReaderInlineError = readCompactReaderInlineError();
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
		this.enableUndoSend = readEnableUndoSend();
		this.skipHomeScreen = readSkipHomeScreen();
		this.readerTextSize = readReaderTextSize();
		this.listTextSize = readListTextSize();
		this.defaultReplyMode = readDefaultReplyMode();
		this.defaultComposeFormat = readDefaultComposeFormat();
		this.markAsReadOnOpen = readMarkAsReadOnOpen();
		this.showUnreadInTitle = readShowUnreadInTitle();
		this.showUnreadAppBadge = readShowUnreadAppBadge();
		this.notifyOnNewMail = readNotifyOnNewMail();
		this.applyListLayout();
		this.applyReaderTextSize(this.readerTextSize);
		this.applyListTextSize(this.listTextSize);
	}

	setUser(email: string | null) {
		this.userEmail = email;
		setSyncAccountEmail(email);
		this.displayName = readDisplayName(email);
		this.signature = readSignature(email);
		this.useSignature = readUseSignature(email);
	}

	/** Prepend blank lines and signature before optional quoted reply/forward content. */
	composeBodyWithSignature(suffix = ''): string {
		if (!this.useSignature) return suffix;
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

	confirmDeleteMessage(count: number, permanent: boolean): boolean {
		if (permanent) {
			return confirm(
				count === 1
					? 'Permanently delete this message? This cannot be undone.'
					: `Permanently delete ${count} messages? This cannot be undone.`
			);
		}
		if (!this.confirmBeforeDelete) return true;
		return confirm(
			count === 1 ? 'Move this message to trash?' : `Move ${count} messages to trash?`
		);
	}

	/** Load preferences from the signed-in JMAP account (newer copy wins). */
	async syncFromAccount(): Promise<void> {
		if (!this.userEmail) return;

		const result = await pullAccountSettings(this.userEmail, () => this.init());
		if (result === 'applied') {
			void import('$lib/stores/theme.svelte').then(({ theme }) => theme.init());
			void import('$lib/stores/visual.svelte').then(({ visual }) => visual.init());
		} else if (result === 'empty') {
			// Only push when this account has synced from this device before.
			if (browser && localStorage.getItem(accountSettingsSyncAtKey(this.userEmail))) {
				scheduleAccountSettingsPush();
			}
		}
	}

	async refreshFromAccount(): Promise<boolean> {
		if (!this.userEmail) return false;

		const before = this.exportLocalPreferences();
		const result = await pullAccountSettings(this.userEmail, () => this.init(), { force: true });
		if (result === 'applied') {
			void import('$lib/stores/theme.svelte').then(({ theme }) => theme.init());
			void import('$lib/stores/visual.svelte').then(({ visual }) => visual.init());
		}
		return result === 'applied' || this.exportLocalPreferences() !== before;
	}

	async syncToAccount(): Promise<boolean> {
		await this.syncFromAccount();
		const ok = await pushAccountSettingsNow();
		if (ok) {
			toast.show('Settings saved to your account', 'success');
		} else {
			toast.show('Could not sync settings to your account', 'error');
		}
		return ok;
	}

	private writeStorage(key: string, value: string) {
		if (!browser) return;
		localStorage.setItem(key, value);
		scheduleAccountSettingsPush();
	}

	private removeStorage(key: string) {
		if (!browser) return;
		localStorage.removeItem(key);
		scheduleAccountSettingsPush();
	}

	setBlockExternalContent(value: boolean) {
		this.blockExternalContent = value;
		if (browser) {
			this.writeStorage(STORAGE.blockExternal, String(value));
		}
	}

	setHideExternalContentBanner(value: boolean) {
		this.hideExternalContentBanner = value;
		if (browser) {
			this.writeStorage(STORAGE.hideExternalContentBanner, String(value));
		}
	}

	setAutoLoadMore(value: boolean) {
		this.autoLoadMore = value;
		if (browser) {
			this.writeStorage(STORAGE.autoLoadMore, String(value));
		}
	}

	setHideFolderSidebarHeader(value: boolean) {
		this.hideFolderSidebarHeader = value;
		if (browser) {
			this.writeStorage(STORAGE.hideFolderSidebarHeader, String(value));
		}
	}

	setHideFolderIcons(value: boolean) {
		this.hideFolderIcons = value;
		if (browser) {
			this.writeStorage(STORAGE.hideFolderIcons, String(value));
		}
	}

	setHideListHeader(value: boolean) {
		this.hideListHeader = value;
		if (browser) {
			this.writeStorage(STORAGE.hideListHeader, String(value));
		}
	}

	setListDensity(value: ListDensity) {
		this.listDensity = value;
		if (browser) {
			this.writeStorage(STORAGE.listDensity, value);
		}
		this.applyListLayout();
	}

	setShowListPreview(value: boolean) {
		this.showListPreview = value;
		if (browser) {
			this.writeStorage(STORAGE.showListPreview, String(value));
		}
		this.applyListLayout();
	}

	setShowAvatars(value: boolean) {
		this.showAvatars = value;
		if (browser) {
			this.writeStorage(STORAGE.showAvatars, String(value));
		}
	}

	setShowStarsInList(value: boolean) {
		this.showStarsInList = value;
		if (browser) {
			this.writeStorage(STORAGE.showStarsInList, String(value));
		}
	}

	setShowAttachmentIcons(value: boolean) {
		this.showAttachmentIcons = value;
		if (browser) {
			this.writeStorage(STORAGE.showAttachmentIcons, String(value));
		}
	}

	setShowMessageCounts(value: boolean) {
		this.showMessageCounts = value;
		if (browser) {
			this.writeStorage(STORAGE.showMessageCounts, String(value));
		}
	}

	setShowFullDatesInList(value: boolean) {
		this.showFullDatesInList = value;
		if (browser) {
			this.writeStorage(STORAGE.showFullDatesInList, String(value));
		}
	}

	setShowSenderEmailInList(value: boolean) {
		this.showSenderEmailInList = value;
		if (browser) {
			this.writeStorage(STORAGE.showSenderEmailInList, String(value));
		}
	}

	setSubjectOnlyList(value: boolean) {
		this.subjectOnlyList = value;
		if (browser) {
			this.writeStorage(STORAGE.subjectOnlyList, String(value));
		}
	}

	setShowListTimestamps(value: boolean) {
		this.showListTimestamps = value;
		if (browser) {
			this.writeStorage(STORAGE.showListTimestamps, String(value));
		}
	}

	setHighlightUnreadInList(value: boolean) {
		this.highlightUnreadInList = value;
		if (browser) {
			this.writeStorage(STORAGE.highlightUnreadInList, String(value));
		}
	}

	setPreferPlainText(value: boolean) {
		this.preferPlainText = value;
		if (browser) {
			this.writeStorage(STORAGE.preferPlainText, String(value));
		}
	}

	setHideReaderRecipients(value: boolean) {
		this.hideReaderRecipients = value;
		if (browser) {
			this.writeStorage(STORAGE.hideReaderRecipients, String(value));
		}
	}

	setToolIconsOnly(value: boolean) {
		this.toolIconsOnly = value;
		if (browser) {
			this.writeStorage(STORAGE.toolIconsOnly, String(value));
		}
	}

	setCollapseQuotedInCompose(value: boolean) {
		this.collapseQuotedInCompose = value;
		if (browser) {
			this.writeStorage(STORAGE.collapseQuotedInCompose, String(value));
		}
	}

	setHideEmptyReaderPrompts(value: boolean) {
		this.hideEmptyReaderPrompts = value;
		if (browser) {
			this.writeStorage(STORAGE.hideEmptyReaderPrompts, String(value));
		}
	}

	setHideEmptyReaderDescription(value: boolean) {
		this.hideEmptyReaderDescription = value;
		if (browser) {
			this.writeStorage(STORAGE.hideEmptyReaderDescription, String(value));
		}
	}

	setHideEmptyReaderActions(value: boolean) {
		this.hideEmptyReaderActions = value;
		if (browser) {
			this.writeStorage(STORAGE.hideEmptyReaderActions, String(value));
		}
	}

	setHideEmptyReaderIcon(value: boolean) {
		this.hideEmptyReaderIcon = value;
		if (browser) {
			this.writeStorage(STORAGE.hideEmptyReaderIcon, String(value));
		}
	}

	setHideThreadSummary(value: boolean) {
		this.hideThreadSummary = value;
		if (browser) {
			this.writeStorage(STORAGE.hideThreadSummary, String(value));
		}
	}

	setShowFolderUnreadCounts(value: boolean) {
		this.showFolderUnreadCounts = value;
		if (browser) {
			this.writeStorage(STORAGE.showFolderUnreadCounts, String(value));
		}
	}

	setShowBulkSelect(value: boolean) {
		this.showBulkSelect = value;
		if (browser) {
			this.writeStorage(STORAGE.showBulkSelect, String(value));
		}
	}

	setHideHeaderSearch(value: boolean) {
		this.hideHeaderSearch = value;
		if (browser) {
			this.writeStorage(STORAGE.hideHeaderSearch, String(value));
		}
	}

	setHideOfflineIndicator(value: boolean) {
		this.hideOfflineIndicator = value;
		if (browser) {
			this.writeStorage(STORAGE.hideOfflineIndicator, String(value));
		}
	}

	setShowQuickReply(value: boolean) {
		this.showQuickReply = value;
		if (browser) {
			this.writeStorage(STORAGE.showQuickReply, String(value));
		}
	}

	setShowReaderContactActions(value: boolean) {
		this.showReaderContactActions = value;
		if (browser) {
			this.writeStorage(STORAGE.showReaderContactActions, String(value));
		}
	}

	setExpandAllThreadMessages(value: boolean) {
		this.expandAllThreadMessages = value;
		if (browser) {
			this.writeStorage(STORAGE.expandAllThreadMessages, String(value));
		}
	}

	setCompactLayout(value: boolean) {
		this.compactLayout = value;
		if (browser) {
			this.writeStorage(STORAGE.compactLayout, String(value));
		}
		this.applyLayoutWidth();
	}

	setHideComposeHints(value: boolean) {
		this.hideComposeHints = value;
		if (browser) {
			this.writeStorage(STORAGE.hideComposeHints, String(value));
		}
	}

	setShowComposeContactSuggestions(value: boolean) {
		this.showComposeContactSuggestions = value;
		if (browser) {
			this.writeStorage(STORAGE.showComposeContactSuggestions, String(value));
		}
	}

	setShowSearchContactSuggestions(value: boolean) {
		this.showSearchContactSuggestions = value;
		if (browser) {
			this.writeStorage(STORAGE.showSearchContactSuggestions, String(value));
		}
	}

	setShowCcBccInCompose(value: boolean) {
		this.showCcBccInCompose = value;
		if (browser) {
			this.writeStorage(STORAGE.showCcBccInCompose, String(value));
		}
	}

	setReduceMotion(value: boolean) {
		this.reduceMotion = value;
		if (browser) {
			this.writeStorage(STORAGE.reduceMotion, String(value));
		}
		this.applyReduceMotion();
	}

	setCompactHeaderActions(value: boolean) {
		this.compactHeaderActions = value;
		if (browser) {
			this.writeStorage(STORAGE.compactHeaderActions, String(value));
		}
	}

	setRememberLastMailbox(value: boolean) {
		this.rememberLastMailbox = value;
		if (browser) {
			this.writeStorage(STORAGE.rememberLastMailbox, String(value));
		}
	}

	setHideAppTitle(value: boolean) {
		this.hideAppTitle = value;
		if (browser) {
			this.writeStorage(STORAGE.hideAppTitle, String(value));
		}
	}

	setCompactUserMenu(value: boolean) {
		this.compactUserMenu = value;
		if (browser) {
			this.writeStorage(STORAGE.compactUserMenu, String(value));
		}
	}

	setHideListEmptyHints(value: boolean) {
		this.hideListEmptyHints = value;
		if (browser) {
			this.writeStorage(STORAGE.hideListEmptyHints, String(value));
		}
	}

	setHideListEmptyActions(value: boolean) {
		this.hideListEmptyActions = value;
		if (browser) {
			this.writeStorage(STORAGE.hideListEmptyActions, String(value));
		}
	}

	setHideSelectionHints(value: boolean) {
		this.hideSelectionHints = value;
		if (browser) {
			this.writeStorage(STORAGE.hideSelectionHints, String(value));
		}
	}

	setHideReaderTimestamps(value: boolean) {
		this.hideReaderTimestamps = value;
		if (browser) {
			this.writeStorage(STORAGE.hideReaderTimestamps, String(value));
		}
	}

	setHideCollapsedThreadPreviews(value: boolean) {
		this.hideCollapsedThreadPreviews = value;
		if (browser) {
			this.writeStorage(STORAGE.hideCollapsedThreadPreviews, String(value));
		}
	}

	setHideSettingsNavHints(value: boolean) {
		this.hideSettingsNavHints = value;
		if (browser) {
			this.writeStorage(STORAGE.hideSettingsNavHints, String(value));
		}
	}

	setHideSettingsPanelDescriptions(value: boolean) {
		this.hideSettingsPanelDescriptions = value;
		if (browser) {
			this.writeStorage(STORAGE.hideSettingsPanelDescriptions, String(value));
		}
	}

	setCompactFolderSidebar(value: boolean) {
		this.compactFolderSidebar = value;
		if (browser) {
			this.writeStorage(STORAGE.compactFolderSidebar, String(value));
		}
	}

	setCompactAttachments(value: boolean) {
		this.compactAttachments = value;
		if (browser) {
			this.writeStorage(STORAGE.compactAttachments, String(value));
		}
	}

	setHideReaderSenderEmail(value: boolean) {
		this.hideReaderSenderEmail = value;
		if (browser) {
			this.writeStorage(STORAGE.hideReaderSenderEmail, String(value));
		}
	}

	setHideComposeFromLine(value: boolean) {
		this.hideComposeFromLine = value;
		if (browser) {
			this.writeStorage(STORAGE.hideComposeFromLine, String(value));
		}
	}

	setHideComposeFieldLabels(value: boolean) {
		this.hideComposeFieldLabels = value;
		if (browser) {
			this.writeStorage(STORAGE.hideComposeFieldLabels, String(value));
		}
	}

	setComposeDrawerWidth(value: ComposeDrawerWidth) {
		this.composeDrawerWidth = value;
		if (browser) {
			this.writeStorage(STORAGE.composeDrawerWidth, value);
		}
	}

	setComposeLayout(value: ComposeLayout) {
		this.composeLayout = value;
		if (browser) {
			this.writeStorage(STORAGE.composeLayout, value);
		}
	}

	setHideOutboxUnlessFailed(value: boolean) {
		this.hideOutboxUnlessFailed = value;
		if (browser) {
			this.writeStorage(STORAGE.hideOutboxUnlessFailed, String(value));
		}
	}

	setHideListActiveIndicator(value: boolean) {
		this.hideListActiveIndicator = value;
		if (browser) {
			this.writeStorage(STORAGE.hideListActiveIndicator, String(value));
		}
	}

	setCompactListRows(value: boolean) {
		this.compactListRows = value;
		if (browser) {
			this.writeStorage(STORAGE.compactListRows, String(value));
		}
	}

	setHideMailShortcutsHelp(value: boolean) {
		this.hideMailShortcutsHelp = value;
		if (browser) {
			this.writeStorage(STORAGE.hideMailShortcutsHelp, String(value));
		}
	}

	setHideMoveMenuLabels(value: boolean) {
		this.hideMoveMenuLabels = value;
		if (browser) {
			this.writeStorage(STORAGE.hideMoveMenuLabels, String(value));
		}
	}

	setIconOnlyComposeAttach(value: boolean) {
		this.iconOnlyComposeAttach = value;
		if (browser) {
			this.writeStorage(STORAGE.iconOnlyComposeAttach, String(value));
		}
	}

	setCompactReaderHeader(value: boolean) {
		this.compactReaderHeader = value;
		if (browser) {
			this.writeStorage(STORAGE.compactReaderHeader, String(value));
		}
	}

	setCompactReaderBody(value: boolean) {
		this.compactReaderBody = value;
		if (browser) {
			this.writeStorage(STORAGE.compactReaderBody, String(value));
		}
	}

	setLoadingIndicatorStyle(value: LoadingIndicatorStyle) {
		this.loadingIndicatorStyle = value;
		if (browser) {
			this.writeStorage(STORAGE.loadingIndicatorStyle, value);
			this.removeStorage(STORAGE.minimalLoadingStates);
		}
	}

	setHideConnectingScreen(value: boolean) {
		this.hideConnectingScreen = value;
		if (browser) {
			this.writeStorage(STORAGE.hideConnectingScreen, String(value));
		}
	}

	setCompactToolSwitcher(value: boolean) {
		this.compactToolSwitcher = value;
		if (browser) {
			this.writeStorage(STORAGE.compactToolSwitcher, String(value));
		}
	}

	setHideSearchDropdownHeaders(value: boolean) {
		this.hideSearchDropdownHeaders = value;
		if (browser) {
			this.writeStorage(STORAGE.hideSearchDropdownHeaders, String(value));
		}
	}

	setHidePaneBorders(value: boolean) {
		this.hidePaneBorders = value;
		if (browser) {
			this.writeStorage(STORAGE.hidePaneBorders, String(value));
		}
	}

	setHideListRowDividers(value: boolean) {
		this.hideListRowDividers = value;
		if (browser) {
			this.writeStorage(STORAGE.hideListRowDividers, String(value));
		}
	}

	setHideReaderPaneBorders(value: boolean) {
		this.hideReaderPaneBorders = value;
		if (browser) {
			this.writeStorage(STORAGE.hideReaderPaneBorders, String(value));
		}
	}

	setHideSearchListPrefix(value: boolean) {
		this.hideSearchListPrefix = value;
		if (browser) {
			this.writeStorage(STORAGE.hideSearchListPrefix, String(value));
		}
	}

	setCompactMobileSearch(value: boolean) {
		this.compactMobileSearch = value;
		if (browser) {
			this.writeStorage(STORAGE.compactMobileSearch, String(value));
		}
	}

	setHideAccountFieldHints(value: boolean) {
		this.hideAccountFieldHints = value;
		if (browser) {
			this.writeStorage(STORAGE.hideAccountFieldHints, String(value));
		}
	}

	setCompactQuickReply(value: boolean) {
		this.compactQuickReply = value;
		if (browser) {
			this.writeStorage(STORAGE.compactQuickReply, String(value));
		}
	}

	setHideComposePanelBorders(value: boolean) {
		this.hideComposePanelBorders = value;
		if (browser) {
			this.writeStorage(STORAGE.hideComposePanelBorders, String(value));
		}
	}

	setIconOnlyComposeDiscard(value: boolean) {
		this.iconOnlyComposeDiscard = value;
		if (browser) {
			this.writeStorage(STORAGE.iconOnlyComposeDiscard, String(value));
		}
	}

	setCompactComposeAttachments(value: boolean) {
		this.compactComposeAttachments = value;
		if (browser) {
			this.writeStorage(STORAGE.compactComposeAttachments, String(value));
		}
	}

	setHideActionToasts(value: boolean) {
		this.hideActionToasts = value;
		if (browser) {
			this.writeStorage(STORAGE.hideActionToasts, String(value));
		}
	}

	setCompactSidebarShortcuts(value: boolean) {
		this.compactSidebarShortcuts = value;
		if (browser) {
			this.writeStorage(STORAGE.compactSidebarShortcuts, String(value));
		}
	}

	setCompactToasts(value: boolean) {
		this.compactToasts = value;
		if (browser) {
			this.writeStorage(STORAGE.compactToasts, String(value));
		}
	}

	setHideToastIcons(value: boolean) {
		this.hideToastIcons = value;
		if (browser) {
			this.writeStorage(STORAGE.hideToastIcons, String(value));
		}
	}

	setCompactLoadMore(value: boolean) {
		this.compactLoadMore = value;
		if (browser) {
			this.writeStorage(STORAGE.compactLoadMore, String(value));
		}
	}

	setCompactUserMenuDropdown(value: boolean) {
		this.compactUserMenuDropdown = value;
		if (browser) {
			this.writeStorage(STORAGE.compactUserMenuDropdown, String(value));
		}
	}

	setCompactOutboxMenu(value: boolean) {
		this.compactOutboxMenu = value;
		if (browser) {
			this.writeStorage(STORAGE.compactOutboxMenu, String(value));
		}
	}

	setCompactSettingsRows(value: boolean) {
		this.compactSettingsRows = value;
		if (browser) {
			this.writeStorage(STORAGE.compactSettingsRows, String(value));
		}
	}

	setCompactSettingsLayout(value: boolean) {
		this.compactSettingsLayout = value;
		if (browser) {
			this.writeStorage(STORAGE.compactSettingsLayout, String(value));
		}
	}

	setCompactSettingsPanel(value: boolean) {
		this.compactSettingsPanel = value;
		if (browser) {
			this.writeStorage(STORAGE.compactSettingsPanel, String(value));
		}
	}

	setCompactMoveMenu(value: boolean) {
		this.compactMoveMenu = value;
		if (browser) {
			this.writeStorage(STORAGE.compactMoveMenu, String(value));
		}
	}

	setCompactSearchDropdown(value: boolean) {
		this.compactSearchDropdown = value;
		if (browser) {
			this.writeStorage(STORAGE.compactSearchDropdown, String(value));
		}
	}

	setCompactComposeSuggestions(value: boolean) {
		this.compactComposeSuggestions = value;
		if (browser) {
			this.writeStorage(STORAGE.compactComposeSuggestions, String(value));
		}
	}

	setCompactOfflineIndicator(value: boolean) {
		this.compactOfflineIndicator = value;
		if (browser) {
			this.writeStorage(STORAGE.compactOfflineIndicator, String(value));
		}
	}

	setCompactAppHeader(value: boolean) {
		this.compactAppHeader = value;
		if (browser) {
			this.writeStorage(STORAGE.compactAppHeader, String(value));
		}
		this.applyHeaderLayout();
	}

	setCompactEmptyReader(value: boolean) {
		this.compactEmptyReader = value;
		if (browser) {
			this.writeStorage(STORAGE.compactEmptyReader, String(value));
		}
	}

	setCompactSettingsNav(value: boolean) {
		this.compactSettingsNav = value;
		if (browser) {
			this.writeStorage(STORAGE.compactSettingsNav, String(value));
		}
	}

	setSettingsDetailLevel(value: SettingsDetailLevel) {
		this.settingsDetailLevel = value;
		if (browser) {
			this.writeStorage(STORAGE.settingsDetailLevel, value);
		}
	}

	setHideSettingsBackLink(value: boolean) {
		this.hideSettingsBackLink = value;
		if (browser) {
			this.writeStorage(STORAGE.hideSettingsBackLink, String(value));
		}
	}

	setHideSettingsPageTitle(value: boolean) {
		this.hideSettingsPageTitle = value;
		if (browser) {
			this.writeStorage(STORAGE.hideSettingsPageTitle, String(value));
		}
	}

	setHideReaderStatusBackButton(value: boolean) {
		this.hideReaderStatusBackButton = value;
		if (browser) {
			this.writeStorage(STORAGE.hideReaderStatusBackButton, String(value));
		}
	}

	setHideReaderStatusMessage(value: boolean) {
		this.hideReaderStatusMessage = value;
		if (browser) {
			this.writeStorage(STORAGE.hideReaderStatusMessage, String(value));
		}
	}

	setCompactExternalContentBanner(value: boolean) {
		this.compactExternalContentBanner = value;
		if (browser) {
			this.writeStorage(STORAGE.compactExternalContentBanner, String(value));
		}
	}

	setCompactContactsPage(value: boolean) {
		this.compactContactsPage = value;
		if (browser) {
			this.writeStorage(STORAGE.compactContactsPage, String(value));
		}
	}

	setCompactContactsList(value: boolean) {
		this.compactContactsList = value;
		if (browser) {
			this.writeStorage(STORAGE.compactContactsList, String(value));
		}
	}

	setHideContactMessageCounts(value: boolean) {
		this.hideContactMessageCounts = value;
		if (browser) {
			this.writeStorage(STORAGE.hideContactMessageCounts, String(value));
		}
	}

	setCompactListEmptyState(value: boolean) {
		this.compactListEmptyState = value;
		if (browser) {
			this.writeStorage(STORAGE.compactListEmptyState, String(value));
		}
	}

	setCompactListHeader(value: boolean) {
		this.compactListHeader = value;
		if (browser) {
			this.writeStorage(STORAGE.compactListHeader, String(value));
		}
	}

	setCompactHomeScreen(value: boolean) {
		this.compactHomeScreen = value;
		if (browser) {
			this.writeStorage(STORAGE.compactHomeScreen, String(value));
		}
	}

	setHideHomeScreenSubtitle(value: boolean) {
		this.hideHomeScreenSubtitle = value;
		if (browser) {
			this.writeStorage(STORAGE.hideHomeScreenSubtitle, String(value));
		}
	}

	setHideHomeCardDescriptions(value: boolean) {
		this.hideHomeCardDescriptions = value;
		if (browser) {
			this.writeStorage(STORAGE.hideHomeCardDescriptions, String(value));
		}
	}

	setHideHomeOpenInboxButton(value: boolean) {
		this.hideHomeOpenInboxButton = value;
		if (browser) {
			this.writeStorage(STORAGE.hideHomeOpenInboxButton, String(value));
		}
	}

	setCompactListLoadingSkeleton(value: boolean) {
		this.compactListLoadingSkeleton = value;
		if (browser) {
			this.writeStorage(STORAGE.compactListLoadingSkeleton, String(value));
		}
	}

	setCompactMobileFolderPicker(value: boolean) {
		this.compactMobileFolderPicker = value;
		if (browser) {
			this.writeStorage(STORAGE.compactMobileFolderPicker, String(value));
		}
	}

	setCompactReaderToolbar(value: boolean) {
		this.compactReaderToolbar = value;
		if (browser) {
			this.writeStorage(STORAGE.compactReaderToolbar, String(value));
		}
	}

	setCompactListAvatars(value: boolean) {
		this.compactListAvatars = value;
		if (browser) {
			this.writeStorage(STORAGE.compactListAvatars, String(value));
		}
	}

	setCompactReaderAvatars(value: boolean) {
		this.compactReaderAvatars = value;
		if (browser) {
			this.writeStorage(STORAGE.compactReaderAvatars, String(value));
		}
	}

	setCompactCollapsedThreads(value: boolean) {
		this.compactCollapsedThreads = value;
		if (browser) {
			this.writeStorage(STORAGE.compactCollapsedThreads, String(value));
		}
	}

	setCompactReaderStatus(value: boolean) {
		this.compactReaderStatus = value;
		if (browser) {
			this.writeStorage(STORAGE.compactReaderStatus, String(value));
		}
	}

	setCompactListErrorState(value: boolean) {
		this.compactListErrorState = value;
		if (browser) {
			this.writeStorage(STORAGE.compactListErrorState, String(value));
		}
	}

	setHideListErrorRetry(value: boolean) {
		this.hideListErrorRetry = value;
		if (browser) {
			this.writeStorage(STORAGE.hideListErrorRetry, String(value));
		}
	}

	setCompactReaderSkeleton(value: boolean) {
		this.compactReaderSkeleton = value;
		if (browser) {
			this.writeStorage(STORAGE.compactReaderSkeleton, String(value));
		}
	}

	setCompactFolderBadges(value: boolean) {
		this.compactFolderBadges = value;
		if (browser) {
			this.writeStorage(STORAGE.compactFolderBadges, String(value));
		}
	}

	setCompactFolderTree(value: boolean) {
		this.compactFolderTree = value;
		if (browser) {
			this.writeStorage(STORAGE.compactFolderTree, String(value));
		}
	}

	setCompactFolderSidebarHeader(value: boolean) {
		this.compactFolderSidebarHeader = value;
		if (browser) {
			this.writeStorage(STORAGE.compactFolderSidebarHeader, String(value));
		}
	}

	setCompactFolderLoadingSkeleton(value: boolean) {
		this.compactFolderLoadingSkeleton = value;
		if (browser) {
			this.writeStorage(STORAGE.compactFolderLoadingSkeleton, String(value));
		}
	}

	setHideContactGroupLetters(value: boolean) {
		this.hideContactGroupLetters = value;
		if (browser) {
			this.writeStorage(STORAGE.hideContactGroupLetters, String(value));
		}
	}

	setCompactFolderSidebarError(value: boolean) {
		this.compactFolderSidebarError = value;
		if (browser) {
			this.writeStorage(STORAGE.compactFolderSidebarError, String(value));
		}
	}

	setCompactContactsAddForm(value: boolean) {
		this.compactContactsAddForm = value;
		if (browser) {
			this.writeStorage(STORAGE.compactContactsAddForm, String(value));
		}
	}

	setHideContactsPageSubtitle(value: boolean) {
		this.hideContactsPageSubtitle = value;
		if (browser) {
			this.writeStorage(STORAGE.hideContactsPageSubtitle, String(value));
		}
	}

	setCompactContactsSearch(value: boolean) {
		this.compactContactsSearch = value;
		if (browser) {
			this.writeStorage(STORAGE.compactContactsSearch, String(value));
		}
	}

	setCompactContactsEmptyState(value: boolean) {
		this.compactContactsEmptyState = value;
		if (browser) {
			this.writeStorage(STORAGE.compactContactsEmptyState, String(value));
		}
	}

	setHideContactsHeaderSettings(value: boolean) {
		this.hideContactsHeaderSettings = value;
		if (browser) {
			this.writeStorage(STORAGE.hideContactsHeaderSettings, String(value));
		}
	}

	setHideContactsComposeButton(value: boolean) {
		this.hideContactsComposeButton = value;
		if (browser) {
			this.writeStorage(STORAGE.hideContactsComposeButton, String(value));
		}
	}

	setHideContactsEmptyHints(value: boolean) {
		this.hideContactsEmptyHints = value;
		if (browser) {
			this.writeStorage(STORAGE.hideContactsEmptyHints, String(value));
		}
	}

	setHideContactsEmptyActions(value: boolean) {
		this.hideContactsEmptyActions = value;
		if (browser) {
			this.writeStorage(STORAGE.hideContactsEmptyActions, String(value));
		}
	}

	setHideContactsHoverActions(value: boolean) {
		this.hideContactsHoverActions = value;
		if (browser) {
			this.writeStorage(STORAGE.hideContactsHoverActions, String(value));
		}
	}

	setHideContactsRowMailIcon(value: boolean) {
		this.hideContactsRowMailIcon = value;
		if (browser) {
			this.writeStorage(STORAGE.hideContactsRowMailIcon, String(value));
		}
	}

	setHideContactsEmailLine(value: boolean) {
		this.hideContactsEmailLine = value;
		if (browser) {
			this.writeStorage(STORAGE.hideContactsEmailLine, String(value));
		}
	}

	setCompactCalendarGrid(value: boolean) {
		this.compactCalendarGrid = value;
		if (browser) {
			this.writeStorage(STORAGE.compactCalendarGrid, String(value));
		}
	}

	setCompactCalendarHeader(value: boolean) {
		this.compactCalendarHeader = value;
		if (browser) {
			this.writeStorage(STORAGE.compactCalendarHeader, String(value));
		}
	}

	setCompactCalendarSidebar(value: boolean) {
		this.compactCalendarSidebar = value;
		if (browser) {
			this.writeStorage(STORAGE.compactCalendarSidebar, String(value));
		}
	}

	setCalendarWeekStartsOnMonday(value: boolean) {
		this.calendarWeekStartsOnMonday = value;
		if (browser) {
			this.writeStorage(STORAGE.calendarWeekStartsOnMonday, String(value));
		}
	}

	setHideCalendarEventTimes(value: boolean) {
		this.hideCalendarEventTimes = value;
		if (browser) {
			this.writeStorage(STORAGE.hideCalendarEventTimes, String(value));
		}
	}

	setCalendarMaxEventsPerDay(value: CalendarMaxEventsPerDay) {
		this.calendarMaxEventsPerDay = value;
		if (browser) {
			this.writeStorage(STORAGE.calendarMaxEventsPerDay, String(value));
		}
	}

	setHideCalendarMoreEventsLabel(value: boolean) {
		this.hideCalendarMoreEventsLabel = value;
		if (browser) {
			this.writeStorage(STORAGE.hideCalendarMoreEventsLabel, String(value));
		}
	}

	setHideCalendarSidebarHeader(value: boolean) {
		this.hideCalendarSidebarHeader = value;
		if (browser) {
			this.writeStorage(STORAGE.hideCalendarSidebarHeader, String(value));
		}
	}

	setHideCalendarSidebarSettings(value: boolean) {
		this.hideCalendarSidebarSettings = value;
		if (browser) {
			this.writeStorage(STORAGE.hideCalendarSidebarSettings, String(value));
		}
	}

	setHideCalendarNewEventButton(value: boolean) {
		this.hideCalendarNewEventButton = value;
		if (browser) {
			this.writeStorage(STORAGE.hideCalendarNewEventButton, String(value));
		}
	}

	setIconOnlyCalendarNewEvent(value: boolean) {
		this.iconOnlyCalendarNewEvent = value;
		if (browser) {
			this.writeStorage(STORAGE.iconOnlyCalendarNewEvent, String(value));
		}
	}

	setCompactCalendarEventPanel(value: boolean) {
		this.compactCalendarEventPanel = value;
		if (browser) {
			this.writeStorage(STORAGE.compactCalendarEventPanel, String(value));
		}
	}

	setHideCalendarEmptyEventPanel(value: boolean) {
		this.hideCalendarEmptyEventPanel = value;
		if (browser) {
			this.writeStorage(STORAGE.hideCalendarEmptyEventPanel, String(value));
		}
	}

	setCompactCalendarEmptyEventPanel(value: boolean) {
		this.compactCalendarEmptyEventPanel = value;
		if (browser) {
			this.writeStorage(STORAGE.compactCalendarEmptyEventPanel, String(value));
		}
	}

	setCompactCalendarCompose(value: boolean) {
		this.compactCalendarCompose = value;
		if (browser) {
			this.writeStorage(STORAGE.compactCalendarCompose, String(value));
		}
	}

	setHideCalendarComposeFieldLabels(value: boolean) {
		this.hideCalendarComposeFieldLabels = value;
		if (browser) {
			this.writeStorage(STORAGE.hideCalendarComposeFieldLabels, String(value));
		}
	}

	setHideCalendarPaneBorders(value: boolean) {
		this.hideCalendarPaneBorders = value;
		if (browser) {
			this.writeStorage(STORAGE.hideCalendarPaneBorders, String(value));
		}
	}

	setCompactReaderInlineError(value: boolean) {
		this.compactReaderInlineError = value;
		if (browser) {
			this.writeStorage(STORAGE.compactReaderInlineError, String(value));
		}
	}

	setLastMailbox(routeId: string) {
		if (!browser || !routeId.trim()) return;
		this.writeStorage(STORAGE.lastMailbox, routeId.trim());
	}

	preferredMailHref(): string {
		if (!this.rememberLastMailbox) return '/mail/inbox';
		return `/mail/${readLastMailbox()}`;
	}

	setMinimalReaderToolbar(value: boolean) {
		this.minimalReaderToolbar = value;
		if (browser) {
			this.writeStorage(STORAGE.minimalReaderToolbar, String(value));
		}
	}

	setHideSidebarShortcuts(value: boolean) {
		this.hideSidebarShortcuts = value;
		if (browser) {
			this.writeStorage(STORAGE.hideSidebarShortcuts, String(value));
		}
	}

	setExpandListUntilOpen(value: boolean) {
		this.expandListUntilOpen = value;
		if (browser) {
			this.writeStorage(STORAGE.expandListUntilOpen, String(value));
		}
	}

	setMailOnlyNavigation(value: boolean) {
		this.mailOnlyNavigation = value;
		if (browser) {
			this.writeStorage(STORAGE.mailOnlyNavigation, String(value));
		}
	}

	setEnableKeyboardShortcuts(value: boolean) {
		this.enableKeyboardShortcuts = value;
		if (browser) {
			this.writeStorage(STORAGE.enableKeyboardShortcuts, String(value));
		}
	}

	setConfirmBeforeDelete(value: boolean) {
		this.confirmBeforeDelete = value;
		if (browser) {
			this.writeStorage(STORAGE.confirmBeforeDelete, String(value));
		}
	}

	setConfirmBeforeDiscardCompose(value: boolean) {
		this.confirmBeforeDiscardCompose = value;
		if (browser) {
			this.writeStorage(STORAGE.confirmBeforeDiscardCompose, String(value));
		}
	}

	setReturnToInboxAfterSend(value: boolean) {
		this.returnToInboxAfterSend = value;
		if (browser) {
			this.writeStorage(STORAGE.returnToInboxAfterSend, String(value));
		}
	}

	setEnableUndoSend(value: boolean) {
		this.enableUndoSend = value;
		if (browser) {
			this.writeStorage(STORAGE.enableUndoSend, String(value));
		}
	}

	setSkipHomeScreen(value: boolean) {
		this.skipHomeScreen = value;
		if (browser) {
			this.writeStorage(STORAGE.skipHomeScreen, String(value));
		}
	}

	setReaderTextSize(value: ReaderTextSize) {
		this.readerTextSize = value;
		if (browser) {
			this.writeStorage(STORAGE.readerTextSize, value);
		}
		this.applyReaderTextSize(value);
	}

	setListTextSize(value: ListTextSize) {
		this.listTextSize = value;
		if (browser) {
			this.writeStorage(STORAGE.listTextSize, value);
		}
		this.applyListTextSize(value);
	}

	setDefaultReplyMode(value: DefaultReplyMode) {
		this.defaultReplyMode = value;
		if (browser) {
			this.writeStorage(STORAGE.defaultReplyMode, value);
		}
	}

	setDefaultComposeFormat(value: ComposeFormat) {
		this.defaultComposeFormat = value;
		if (browser) {
			this.writeStorage(STORAGE.defaultComposeFormat, value);
		}
	}

	setUseSignature(value: boolean) {
		this.useSignature = value;
		if (!browser || !this.userEmail) return;
		this.writeStorage(STORAGE.useSignature(this.userEmail), String(value));
	}

	setMarkAsReadOnOpen(value: boolean) {
		this.markAsReadOnOpen = value;
		if (browser) {
			this.writeStorage(STORAGE.markAsReadOnOpen, String(value));
		}
	}

	setShowUnreadInTitle(value: boolean) {
		this.showUnreadInTitle = value;
		if (browser) {
			this.writeStorage(STORAGE.showUnreadInTitle, String(value));
		}
		if (browser) {
			void import('$lib/utils/document-title').then(({ applyUnreadPrefixToDocument }) =>
				applyUnreadPrefixToDocument()
			);
		}
	}

	setShowUnreadAppBadge(value: boolean) {
		this.showUnreadAppBadge = value;
		if (browser) {
			this.writeStorage(STORAGE.showUnreadAppBadge, String(value));
			void import('$lib/utils/document-title').then(({ applyUnreadPrefixToDocument }) =>
				applyUnreadPrefixToDocument()
			);
		}
	}

	setNotifyOnNewMail(value: boolean) {
		this.notifyOnNewMail = value;
		if (browser) {
			this.writeStorage(STORAGE.notifyOnNewMail, String(value));
			void syncPushSubscription(value);
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
			this.writeStorage(STORAGE.displayName(this.userEmail), trimmed);
		} else {
			this.removeStorage(STORAGE.displayName(this.userEmail));
		}
	}

	setSignature(value: string) {
		this.signature = value;
		if (!browser || !this.userEmail) return;

		const trimmed = value.trim();
		if (trimmed) {
			this.writeStorage(STORAGE.signature(this.userEmail), value);
		} else {
			this.removeStorage(STORAGE.signature(this.userEmail));
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
		this.setHideEmptyReaderDescription(false);
		this.setHideEmptyReaderActions(false);
		this.setHideEmptyReaderIcon(false);
		this.setHideThreadSummary(false);
		this.setShowFolderUnreadCounts(true);
		this.setShowBulkSelect(true);
		this.setHideHeaderSearch(false);
		this.setHideOfflineIndicator(false);
		this.setExpandListUntilOpen(false);
		this.setReaderTextSize('normal');
		this.setListTextSize('normal');
		this.setDefaultReplyMode('reply');
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
		this.setHideListEmptyActions(false);
		this.setHideSelectionHints(false);
		this.setHideReaderTimestamps(false);
		this.setHideCollapsedThreadPreviews(false);
		this.setHideSettingsNavHints(false);
		this.setHideSettingsPanelDescriptions(false);
		this.setCompactFolderSidebar(false);
		this.setCompactAttachments(false);
		this.setHideReaderSenderEmail(false);
		this.setHideComposeFromLine(false);
		this.setHideComposeFieldLabels(false);
		this.setComposeDrawerWidth('default');
		this.setComposeLayout('drawer');
		this.setHideOutboxUnlessFailed(false);
		this.setHideListActiveIndicator(false);
		this.setCompactListRows(false);
		this.setHideMailShortcutsHelp(false);
		this.setHideMoveMenuLabels(false);
		this.setIconOnlyComposeAttach(false);
		this.setCompactReaderHeader(false);
		this.setCompactReaderBody(false);
		this.setLoadingIndicatorStyle('skeleton');
		this.setHideConnectingScreen(false);
		this.setCompactToolSwitcher(false);
		this.setHideSearchDropdownHeaders(false);
		this.setHidePaneBorders(false);
		this.setHideListRowDividers(false);
		this.setHideReaderPaneBorders(false);
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
		this.setHideToastIcons(false);
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
		this.setHideSettingsBackLink(false);
		this.setHideSettingsPageTitle(false);
		this.setHideReaderStatusBackButton(false);
		this.setHideReaderStatusMessage(false);
		this.setCompactExternalContentBanner(false);
		this.setCompactContactsPage(false);
		this.setCompactContactsList(false);
		this.setHideContactMessageCounts(false);
		this.setCompactListEmptyState(false);
		this.setCompactListHeader(false);
		this.setCompactHomeScreen(false);
		this.setHideHomeScreenSubtitle(false);
		this.setHideHomeCardDescriptions(false);
		this.setHideHomeOpenInboxButton(false);
		this.setCompactListLoadingSkeleton(false);
		this.setCompactMobileFolderPicker(false);
		this.setCompactReaderToolbar(false);
		this.setCompactListAvatars(false);
		this.setCompactReaderAvatars(false);
		this.setCompactCollapsedThreads(false);
		this.setCompactReaderStatus(false);
		this.setCompactListErrorState(false);
		this.setHideListErrorRetry(false);
		this.setCompactReaderSkeleton(false);
		this.setCompactFolderBadges(false);
		this.setCompactFolderTree(false);
		this.setCompactFolderSidebarHeader(false);
		this.setCompactFolderLoadingSkeleton(false);
		this.setHideContactGroupLetters(false);
		this.setCompactFolderSidebarError(false);
		this.setCompactContactsAddForm(false);
		this.setHideContactsPageSubtitle(false);
		this.setCompactContactsSearch(false);
		this.setCompactContactsEmptyState(false);
		this.setHideContactsHeaderSettings(false);
		this.setHideContactsComposeButton(false);
		this.setHideContactsEmptyHints(false);
		this.setHideContactsEmptyActions(false);
		this.setHideContactsHoverActions(false);
		this.setHideContactsRowMailIcon(false);
		this.setHideContactsEmailLine(false);
		this.setCompactCalendarGrid(false);
		this.setCompactCalendarHeader(false);
		this.setCompactCalendarSidebar(false);
		this.setCalendarWeekStartsOnMonday(false);
		this.setHideCalendarEventTimes(false);
		this.setCalendarMaxEventsPerDay(3);
		this.setHideCalendarMoreEventsLabel(false);
		this.setHideCalendarSidebarHeader(false);
		this.setHideCalendarSidebarSettings(false);
		this.setHideCalendarNewEventButton(false);
		this.setIconOnlyCalendarNewEvent(false);
		this.setCompactCalendarEventPanel(false);
		this.setHideCalendarEmptyEventPanel(false);
		this.setCompactCalendarEmptyEventPanel(false);
		this.setCompactCalendarCompose(false);
		this.setHideCalendarComposeFieldLabels(false);
		this.setHideCalendarPaneBorders(false);
		this.setCompactReaderInlineError(false);
		this.setRememberLastMailbox(false);
		this.setMinimalReaderToolbar(false);
		this.setSkipHomeScreen(false);
		this.setHideSidebarShortcuts(false);
		this.setMailOnlyNavigation(false);
		void import('$lib/stores/visual.svelte').then(({ visual }) => visual.resetToDefaults());
		void import('$lib/stores/theme.svelte').then(({ theme }) => theme.set('system'));
	}

	resetLookAndFeel() {
		void import('$lib/stores/visual.svelte').then(({ visual }) => visual.resetToDefaults());
		void import('$lib/stores/theme.svelte').then(({ theme }) => theme.set('system'));
		this.setReduceMotion(false);
		this.setLoadingIndicatorStyle('skeleton');
		this.setCompactListLoadingSkeleton(false);
		this.setCompactReaderSkeleton(false);
		this.setCompactFolderLoadingSkeleton(false);
		this.setCompactFolderSidebarError(false);
		this.setHideConnectingScreen(false);
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
		this.setHideListEmptyActions(true);
		this.setHideSelectionHints(true);
		this.setHideReaderTimestamps(true);
		this.setHideCollapsedThreadPreviews(true);
		this.setHideSettingsNavHints(true);
		this.setHideSettingsPanelDescriptions(true);
		this.setCompactFolderSidebar(true);
		this.setCompactAttachments(true);
		this.setHideReaderSenderEmail(true);
		this.setHideComposeFromLine(true);
		this.setHideComposeFieldLabels(true);
		this.setComposeDrawerWidth('narrow');
		this.setHideOutboxUnlessFailed(true);
		this.setHideListActiveIndicator(true);
		this.setCompactListRows(true);
		this.setHideMailShortcutsHelp(true);
		this.setHideMoveMenuLabels(true);
		this.setIconOnlyComposeAttach(true);
		this.setCompactReaderHeader(true);
		this.setCompactReaderBody(true);
		this.setLoadingIndicatorStyle('minimal');
		this.setHideConnectingScreen(true);
		this.setCompactToolSwitcher(true);
		this.setHideSearchDropdownHeaders(true);
		this.setHidePaneBorders(true);
		this.setHideListRowDividers(true);
		this.setHideReaderPaneBorders(true);
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
		this.setHideToastIcons(true);
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
		this.setHideSettingsBackLink(true);
		this.setHideSettingsPageTitle(true);
		this.setHideReaderStatusBackButton(true);
		this.setHideReaderStatusMessage(true);
		this.setCompactExternalContentBanner(true);
		this.setCompactContactsPage(true);
		this.setCompactContactsList(true);
		this.setHideContactMessageCounts(true);
		this.setCompactListEmptyState(true);
		this.setCompactListHeader(true);
		this.setCompactHomeScreen(true);
		this.setHideHomeScreenSubtitle(true);
		this.setHideHomeCardDescriptions(true);
		this.setHideHomeOpenInboxButton(true);
		this.setCompactListLoadingSkeleton(true);
		this.setCompactMobileFolderPicker(true);
		this.setCompactReaderToolbar(true);
		this.setCompactListAvatars(true);
		this.setCompactReaderAvatars(true);
		this.setCompactCollapsedThreads(true);
		this.setCompactReaderStatus(true);
		this.setCompactListErrorState(true);
		this.setHideListErrorRetry(true);
		this.setCompactReaderSkeleton(true);
		this.setCompactFolderBadges(true);
		this.setCompactFolderTree(true);
		this.setCompactFolderSidebarHeader(true);
		this.setCompactFolderLoadingSkeleton(true);
		this.setHideContactGroupLetters(true);
		this.setCompactFolderSidebarError(true);
		this.setCompactContactsAddForm(true);
		this.setHideContactsPageSubtitle(true);
		this.setCompactContactsSearch(true);
		this.setCompactContactsEmptyState(true);
		this.setHideContactsHeaderSettings(true);
		this.setHideContactsComposeButton(true);
		this.setHideContactsEmptyHints(true);
		this.setHideContactsEmptyActions(true);
		this.setHideContactsHoverActions(true);
		this.setHideContactsRowMailIcon(true);
		this.setHideContactsEmailLine(true);
		this.setCompactReaderInlineError(true);
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
		this.setHideEmptyReaderDescription(true);
		this.setHideEmptyReaderActions(true);
		this.setHideEmptyReaderIcon(true);
		this.setHideThreadSummary(true);
		this.setHideFolderSidebarHeader(true);
		this.setHideFolderIcons(true);
		this.setHideListHeader(true);
		this.setAutoLoadMore(true);
	}

	resetMailSettings() {
		this.setNotifyOnNewMail(true);
		this.setShowUnreadInTitle(true);
		this.setShowUnreadAppBadge(true);
		this.setMarkAsReadOnOpen(true);
		this.setEnableKeyboardShortcuts(true);
		this.setConfirmBeforeDelete(true);
		this.setConfirmBeforeDiscardCompose(true);
		this.setReturnToInboxAfterSend(false);
		this.setEnableUndoSend(true);
		this.setHideMailShortcutsHelp(false);
		this.setHideActionToasts(false);
		this.setAutoLoadMore(false);
		this.setCompactLoadMore(false);
	}

	resetInboxSettings() {
		this.setListDensity('comfortable');
		this.setShowListPreview(true);
		this.setShowAvatars(true);
		this.setCompactListAvatars(false);
		this.setShowStarsInList(true);
		this.setShowAttachmentIcons(true);
		this.setShowMessageCounts(true);
		this.setShowFullDatesInList(false);
		this.setSubjectOnlyList(false);
		this.setShowSenderEmailInList(false);
		this.setShowListTimestamps(true);
		this.setHighlightUnreadInList(true);
		this.setCompactListRows(false);
		this.setHideListRowDividers(false);
		this.setHideListActiveIndicator(false);
		this.setShowBulkSelect(true);
		this.setHideSelectionHints(false);
		this.setHideSearchListPrefix(false);
		this.setHideListEmptyHints(false);
		this.setHideListEmptyActions(false);
		this.setCompactListEmptyState(false);
		this.setCompactListErrorState(false);
		this.setHideListErrorRetry(false);
		this.setListTextSize('normal');
		this.setHideListHeader(false);
		this.setCompactListHeader(false);
		this.setCompactMobileFolderPicker(false);
	}

	resetReadingSettings() {
		this.setReaderTextSize('normal');
		this.setBlockExternalContent(true);
		this.setHideExternalContentBanner(false);
		this.setCompactExternalContentBanner(false);
		this.setPreferPlainText(false);
		this.setCompactReaderBody(false);
		this.setCompactAttachments(false);
		this.setHideReaderPaneBorders(false);
		this.setDefaultReplyMode('reply');
		this.setShowQuickReply(true);
		this.setCompactQuickReply(false);
		this.setShowReaderContactActions(true);
		this.setHideReaderRecipients(false);
		this.setHideReaderSenderEmail(false);
		this.setMinimalReaderToolbar(false);
		this.setCompactReaderToolbar(false);
		this.setCompactReaderAvatars(false);
		this.setCompactReaderHeader(false);
		this.setHideMoveMenuLabels(false);
		this.setCompactMoveMenu(false);
		this.setExpandAllThreadMessages(false);
		this.setHideThreadSummary(false);
		this.setHideReaderTimestamps(false);
		this.setHideCollapsedThreadPreviews(false);
		this.setCompactCollapsedThreads(false);
		this.setHideEmptyReaderPrompts(false);
		this.setHideEmptyReaderDescription(false);
		this.setHideEmptyReaderActions(false);
		this.setHideEmptyReaderIcon(false);
		this.setCompactEmptyReader(false);
		this.setCompactReaderStatus(false);
		this.setCompactReaderInlineError(false);
		this.setHideReaderStatusBackButton(false);
		this.setHideReaderStatusMessage(false);
	}

	resetComposeSettings() {
		this.setComposeLayout('drawer');
		this.setDefaultComposeFormat('plain');
		this.setHideComposeHints(false);
		this.setCollapseQuotedInCompose(false);
		this.setShowCcBccInCompose(true);
		this.setHideComposeFromLine(false);
		this.setHideComposeFieldLabels(false);
		this.setComposeDrawerWidth('default');
		this.setIconOnlyComposeAttach(false);
		this.setIconOnlyComposeDiscard(false);
		this.setHideComposePanelBorders(false);
		this.setCompactComposeAttachments(false);
		this.setShowComposeContactSuggestions(true);
		this.setCompactComposeSuggestions(false);
	}

	resetWorkspaceSettings() {
		this.setCompactLayout(false);
		this.setHideFolderSidebarHeader(false);
		this.setCompactFolderSidebarHeader(false);
		this.setHideFolderIcons(false);
		this.setCompactFolderSidebar(false);
		this.setCompactFolderTree(false);
		this.setCompactHeaderActions(false);
		this.setCompactAppHeader(false);
		this.setHidePaneBorders(false);
		this.setHideAppTitle(false);
		this.setCompactUserMenu(false);
		this.setCompactUserMenuDropdown(false);
		this.setExpandListUntilOpen(false);
		this.setCompactFolderSidebarError(false);
		this.setSkipHomeScreen(false);
		this.setCompactHomeScreen(false);
		this.setHideHomeScreenSubtitle(false);
		this.setHideHomeCardDescriptions(false);
		this.setHideHomeOpenInboxButton(false);
		this.setRememberLastMailbox(false);
		this.setHideSidebarShortcuts(false);
		this.setCompactSidebarShortcuts(false);
		this.setMailOnlyNavigation(false);
		this.setHideHeaderSearch(false);
		this.setShowSearchContactSuggestions(true);
		this.setHideSearchDropdownHeaders(false);
		this.setCompactSearchDropdown(false);
		this.setShowFolderUnreadCounts(true);
		this.setCompactFolderBadges(false);
		this.setToolIconsOnly(false);
		this.setCompactToolSwitcher(false);
		this.setHideOfflineIndicator(false);
		this.setCompactOfflineIndicator(false);
		this.setHideOutboxUnlessFailed(false);
		this.setCompactOutboxMenu(false);
		this.setCompactMobileSearch(false);
	}

	resetCalendarSettings() {
		this.setCompactCalendarGrid(false);
		this.setCompactCalendarHeader(false);
		this.setCalendarWeekStartsOnMonday(false);
		this.setCalendarMaxEventsPerDay(3);
		this.setHideCalendarEventTimes(false);
		this.setHideCalendarMoreEventsLabel(false);
		this.setCompactCalendarSidebar(false);
		this.setHideCalendarSidebarHeader(false);
		this.setHideCalendarSidebarSettings(false);
		this.setHideCalendarNewEventButton(false);
		this.setIconOnlyCalendarNewEvent(false);
		this.setCompactCalendarEventPanel(false);
		this.setHideCalendarEmptyEventPanel(false);
		this.setCompactCalendarEmptyEventPanel(false);
		this.setCompactCalendarCompose(false);
		this.setHideCalendarComposeFieldLabels(false);
		this.setHideCalendarPaneBorders(false);
	}

	resetContactsSettings() {
		this.setCompactContactsPage(false);
		this.setCompactContactsList(false);
		this.setCompactContactsSearch(false);
		this.setCompactContactsAddForm(false);
		this.setHideContactMessageCounts(false);
		this.setHideContactGroupLetters(false);
		this.setHideContactsEmailLine(false);
		this.setHideContactsPageSubtitle(false);
		this.setHideContactsHeaderSettings(false);
		this.setHideContactsComposeButton(false);
		this.setHideContactsHoverActions(false);
		this.setHideContactsRowMailIcon(false);
		this.setCompactContactsEmptyState(false);
		this.setHideContactsEmptyHints(false);
		this.setHideContactsEmptyActions(false);
	}

	resetAccountSettings() {
		this.setDisplayName('');
		this.setSignature('');
		this.setUseSignature(true);
		this.setHideAccountFieldHints(false);
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
			this.hideEmptyReaderDescription,
			this.hideEmptyReaderActions,
			this.hideEmptyReaderIcon,
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
			this.hideListEmptyActions,
			this.hideSelectionHints,
			this.hideReaderTimestamps,
			this.hideCollapsedThreadPreviews,
			this.hideSettingsNavHints,
			this.hideSettingsPanelDescriptions,
			this.compactFolderSidebar,
			this.compactAttachments,
			this.hideReaderSenderEmail,
			this.hideComposeFromLine,
			this.hideComposeFieldLabels,
			this.composeDrawerWidth !== 'default',
			this.hideOutboxUnlessFailed,
			this.hideListActiveIndicator,
			this.compactListRows,
			this.hideMailShortcutsHelp,
			this.hideMoveMenuLabels,
			this.iconOnlyComposeAttach,
			this.compactReaderHeader,
			this.compactReaderBody,
			this.loadingIndicatorStyle !== 'skeleton',
			this.hideConnectingScreen,
			this.compactToolSwitcher,
			this.hideSearchDropdownHeaders,
			this.hidePaneBorders,
			this.hideListRowDividers,
			this.hideReaderPaneBorders,
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
			this.hideToastIcons,
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
			this.hideSettingsBackLink,
			this.hideSettingsPageTitle,
			this.hideReaderStatusBackButton,
			this.hideReaderStatusMessage,
			this.compactExternalContentBanner,
			this.compactContactsPage,
			this.compactContactsList,
			this.hideContactMessageCounts,
			this.compactListEmptyState,
			this.compactListHeader,
			this.compactHomeScreen,
			this.hideHomeScreenSubtitle,
			this.hideHomeCardDescriptions,
			this.hideHomeOpenInboxButton,
			this.compactListLoadingSkeleton,
			this.compactMobileFolderPicker,
			this.compactReaderToolbar,
			this.compactListAvatars,
			this.compactReaderAvatars,
			this.compactCollapsedThreads,
			this.compactReaderStatus,
			this.compactListErrorState,
			this.hideListErrorRetry,
			this.compactReaderSkeleton,
			this.compactFolderBadges,
			this.compactFolderTree,
			this.compactFolderSidebarHeader,
			this.compactFolderLoadingSkeleton,
			this.hideContactGroupLetters,
			this.compactFolderSidebarError,
			this.compactContactsAddForm,
			this.hideContactsPageSubtitle,
			this.compactContactsSearch,
			this.compactContactsEmptyState,
			this.hideContactsHeaderSettings,
			this.hideContactsComposeButton,
			this.hideContactsEmptyHints,
			this.hideContactsEmptyActions,
			this.hideContactsHoverActions,
			this.hideContactsRowMailIcon,
			this.hideContactsEmailLine,
			this.compactCalendarGrid,
			this.compactCalendarHeader,
			this.compactCalendarSidebar,
			this.calendarWeekStartsOnMonday,
			this.hideCalendarEventTimes,
			this.hideCalendarMoreEventsLabel,
			this.hideCalendarSidebarHeader,
			this.hideCalendarSidebarSettings,
			this.hideCalendarNewEventButton,
			this.iconOnlyCalendarNewEvent,
			this.compactCalendarEventPanel,
			this.hideCalendarEmptyEventPanel,
			this.compactCalendarEmptyEventPanel,
			this.compactCalendarCompose,
			this.hideCalendarComposeFieldLabels,
			this.hideCalendarPaneBorders,
			this.compactReaderInlineError,
			this.rememberLastMailbox
		];
		return flags.filter(Boolean).length;
	}

	exportLocalPreferences(): string {
		if (!browser) return '{}';

		return JSON.stringify(
			{ version: 1, exportedAt: new Date().toISOString(), settings: collectSyncableSettings() },
			null,
			2
		);
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
				if (this.userEmail && isOtherAccountsScopedKey(key, this.userEmail)) continue;
				localStorage.setItem(key, value);
			}

			this.init();
			void import('$lib/stores/theme.svelte').then(({ theme }) => theme.init());
			void import('$lib/stores/visual.svelte').then(({ visual }) => visual.init());
			scheduleAccountSettingsPush();
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

	private applyListTextSize(value: ListTextSize) {
		if (!browser) return;
		document.documentElement.style.setProperty('--z-list-text', LIST_TEXT_SIZE[value]);
	}
}

export const settings = new SettingsStore();
