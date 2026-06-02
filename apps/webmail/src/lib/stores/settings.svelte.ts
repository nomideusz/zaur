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
import { purgeObsoleteSettings } from '$lib/settings/obsolete-keys';
import { importantRainbow } from '$lib/mail/important-rainbow.svelte';
import { toast } from '$lib/stores/toast.svelte';
import { migrateLegacyMailViewMode } from '$lib/mail/view-mode';
import { INBOX_MAILBOX_ROUTE_ID, mailListHref } from '$lib/mail/routes';
import {
	requestBrowserNotificationPermission,
	syncPushSubscription
} from '$lib/utils/notifications';

export type ReaderTextSize = 'small' | 'normal' | 'large';
export type ReadingTypeface = 'sans' | 'serif';
export type CalendarMaxEventsPerDay = 2 | 3 | 5;
export type DefaultReplyMode = 'reply' | 'reply-all';
export type ComposeFormat = 'plain' | 'html';
export type TimeFormat = 'auto' | '12h' | '24h';
export type SearchScope = 'all' | 'current-folder';
export type UndoSendDelay = 0 | 5000 | 10000 | 20000;

const STORAGE = {
	blockExternal: 'zaur:block-external',
	autoLoadMore: 'zaur:auto-load-more',
	showSenderEmailInList: 'zaur:show-sender-email-in-list',
	showImportantColors: 'zaur:show-important-colors',
	preferPlainText: 'zaur:prefer-plain-text',
	collapseQuotedInCompose: 'zaur:collapse-quoted-in-compose',
	expandAllThreadMessages: 'zaur:expand-all-thread-messages',
	hideComposeHints: 'zaur:hide-compose-hints',
	showComposeContactSuggestions: 'zaur:show-compose-contact-suggestions',
	showCcBccInCompose: 'zaur:show-cc-bcc-in-compose',
	reduceMotion: 'zaur:reduce-motion',
	rememberLastMailbox: 'zaur:remember-last-mailbox',
	lastMailbox: 'zaur:last-mailbox',
	showReaderListRail: 'zaur:show-reader-list-rail',
	enableKeyboardShortcuts: 'zaur:enable-keyboard-shortcuts',
	confirmBeforeDelete: 'zaur:confirm-before-delete',
	confirmBeforeDiscardCompose: 'zaur:confirm-before-discard-compose',
	undoSendDelay: 'zaur:undo-send-delay',
	readerTextSize: 'zaur:reader-text-size',
	readingTypeface: 'zaur:reading-typeface',
	readerCleanView: 'zaur:reader-clean-view',
	focusReadingDefault: 'zaur:focus-reading-default',
	defaultReplyMode: 'zaur:default-reply-mode',
	defaultComposeFormat: 'zaur:default-compose-format',
	useSignature: (email: string) => `zaur:use-signature:${email}`,
	showUnreadInTitle: 'zaur:show-unread-in-title',
	showUnreadAppBadge: 'zaur:show-unread-app-badge',
	notifyOnNewMail: 'zaur:notify-new-mail',
	bccSelf: 'zaur:bcc-self',
	timeFormat: 'zaur:time-format',
	searchScope: 'zaur:search-scope',
	hideActionToasts: 'zaur:hide-action-toasts',
	calendarWeekStartsOnMonday: 'zaur:calendar-week-starts-on-monday',
	hideCalendarEventTimes: 'zaur:hide-calendar-event-times',
	calendarMaxEventsPerDay: 'zaur:calendar-max-events-per-day',
	displayName: (email: string) => `zaur:display-name:${email}`,
	signature: (email: string) => `zaur:signature:${email}`
} as const;

const READER_TEXT_SIZE: Record<ReaderTextSize, string> = {
	small: '1rem',
	normal: '1.0625rem',
	large: '1.1875rem'
};

const READER_LEADING: Record<ReaderTextSize, string> = {
	small: '1.7',
	normal: '1.65',
	large: '1.6'
};

const READING_FONT: Record<ReadingTypeface, string> = {
	sans: 'var(--font-sans)',
	serif:
		"'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Charter, Georgia, Cambria, 'Times New Roman', serif"
};

function readBool(key: string, defaultValue: boolean): boolean {
	if (!browser) return defaultValue;
	const stored = localStorage.getItem(key);
	if (stored === null) return defaultValue;
	return stored === 'true';
}

function readBlockExternal(): boolean {
	return readBool(STORAGE.blockExternal, true);
}

function readAutoLoadMore(): boolean {
	return readBool(STORAGE.autoLoadMore, false);
}

function readShowSenderEmailInList(): boolean {
	return readBool(STORAGE.showSenderEmailInList, false);
}

function readShowImportantColors(): boolean {
	return readBool(STORAGE.showImportantColors, true);
}

function readPreferPlainText(): boolean {
	return readBool(STORAGE.preferPlainText, false);
}

function readCollapseQuotedInCompose(): boolean {
	return readBool(STORAGE.collapseQuotedInCompose, false);
}

function readExpandAllThreadMessages(): boolean {
	return readBool(STORAGE.expandAllThreadMessages, false);
}

function readHideComposeHints(): boolean {
	return readBool(STORAGE.hideComposeHints, false);
}

function readShowComposeContactSuggestions(): boolean {
	return readBool(STORAGE.showComposeContactSuggestions, true);
}

function readShowCcBccInCompose(): boolean {
	return readBool(STORAGE.showCcBccInCompose, true);
}

function readReduceMotion(): boolean {
	return readBool(STORAGE.reduceMotion, false);
}

function readRememberLastMailbox(): boolean {
	return readBool(STORAGE.rememberLastMailbox, false);
}

function readShowReaderListRail(): boolean {
	return readBool(STORAGE.showReaderListRail, false);
}

function readEnableKeyboardShortcuts(): boolean {
	return readBool(STORAGE.enableKeyboardShortcuts, true);
}

function readConfirmBeforeDelete(): boolean {
	return readBool(STORAGE.confirmBeforeDelete, true);
}

function readConfirmBeforeDiscardCompose(): boolean {
	return readBool(STORAGE.confirmBeforeDiscardCompose, true);
}

function readUndoSendDelay(): UndoSendDelay {
	if (!browser) return 5000;
	const stored = localStorage.getItem(STORAGE.undoSendDelay);
	if (stored === null) {
		const legacy = localStorage.getItem('zaur:enable-undo-send');
		if (legacy === 'false') return 0;
		return 5000;
	}
	const val = Number(stored);
	if (val === 0 || val === 5000 || val === 10000 || val === 20000) {
		return val as UndoSendDelay;
	}
	return 5000;
}

function readReaderTextSize(): ReaderTextSize {
	if (!browser) return 'normal';
	const stored = localStorage.getItem(STORAGE.readerTextSize);
	if (stored === 'small' || stored === 'large') return stored;
	return 'normal';
}

function readReadingTypeface(): ReadingTypeface {
	if (!browser) return 'sans';
	return localStorage.getItem(STORAGE.readingTypeface) === 'serif' ? 'serif' : 'sans';
}

function readReaderCleanView(): boolean {
	return readBool(STORAGE.readerCleanView, true);
}

function readFocusReadingDefault(): boolean {
	return readBool(STORAGE.focusReadingDefault, true);
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

function readShowUnreadInTitle(): boolean {
	return readBool(STORAGE.showUnreadInTitle, true);
}

function readShowUnreadAppBadge(): boolean {
	return readBool(STORAGE.showUnreadAppBadge, true);
}

function readNotifyOnNewMail(): boolean {
	return readBool(STORAGE.notifyOnNewMail, true);
}

function readBccSelf(): boolean {
	return readBool(STORAGE.bccSelf, false);
}

function readTimeFormat(): TimeFormat {
	if (!browser) return 'auto';
	const value = localStorage.getItem(STORAGE.timeFormat);
	if (value === '12h' || value === '24h') return value;
	return 'auto';
}

function readSearchScope(): SearchScope {
	if (!browser) return 'all';
	return localStorage.getItem(STORAGE.searchScope) === 'current-folder' ? 'current-folder' : 'all';
}

function readHideActionToasts(): boolean {
	return readBool(STORAGE.hideActionToasts, false);
}

function readCalendarWeekStartsOnMonday(): boolean {
	return readBool(STORAGE.calendarWeekStartsOnMonday, false);
}

function readHideCalendarEventTimes(): boolean {
	return readBool(STORAGE.hideCalendarEventTimes, false);
}

function readCalendarMaxEventsPerDay(): CalendarMaxEventsPerDay {
	if (!browser) return 3;
	const value = localStorage.getItem(STORAGE.calendarMaxEventsPerDay);
	if (value === '2' || value === '5') return Number(value) as CalendarMaxEventsPerDay;
	return 3;
}

function readLastMailbox(): string {
	if (!browser) return 'inbox';
	const saved = localStorage.getItem(STORAGE.lastMailbox);
	return saved?.trim() || 'inbox';
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
	autoLoadMore = $state(readAutoLoadMore());
	showSenderEmailInList = $state(readShowSenderEmailInList());
	showImportantColors = $state(readShowImportantColors());
	preferPlainText = $state(readPreferPlainText());
	collapseQuotedInCompose = $state(readCollapseQuotedInCompose());
	expandAllThreadMessages = $state(readExpandAllThreadMessages());
	hideComposeHints = $state(readHideComposeHints());
	showComposeContactSuggestions = $state(readShowComposeContactSuggestions());
	showCcBccInCompose = $state(readShowCcBccInCompose());
	reduceMotion = $state(readReduceMotion());
	rememberLastMailbox = $state(readRememberLastMailbox());
	showReaderListRail = $state(readShowReaderListRail());
	enableKeyboardShortcuts = $state(readEnableKeyboardShortcuts());
	confirmBeforeDelete = $state(readConfirmBeforeDelete());
	confirmBeforeDiscardCompose = $state(readConfirmBeforeDiscardCompose());
	undoSendDelay = $state<UndoSendDelay>(readUndoSendDelay());
	readerTextSize = $state<ReaderTextSize>(readReaderTextSize());
	readingTypeface = $state<ReadingTypeface>(readReadingTypeface());
	readerCleanView = $state(readReaderCleanView());
	focusReadingDefault = $state(readFocusReadingDefault());
	defaultReplyMode = $state<DefaultReplyMode>(readDefaultReplyMode());
	defaultComposeFormat = $state<ComposeFormat>(readDefaultComposeFormat());
	showUnreadInTitle = $state(readShowUnreadInTitle());
	showUnreadAppBadge = $state(readShowUnreadAppBadge());
	notifyOnNewMail = $state(readNotifyOnNewMail());
	bccSelf = $state(readBccSelf());
	timeFormat = $state<TimeFormat>(readTimeFormat());
	searchScope = $state<SearchScope>(readSearchScope());
	hideActionToasts = $state(readHideActionToasts());
	calendarWeekStartsOnMonday = $state(readCalendarWeekStartsOnMonday());
	hideCalendarEventTimes = $state(readHideCalendarEventTimes());
	calendarMaxEventsPerDay = $state<CalendarMaxEventsPerDay>(readCalendarMaxEventsPerDay());
	displayName = $state('');
	signature = $state('');
	useSignature = $state(true);

	private userEmail: string | null = null;

	init() {
		if (browser) {
			migrateLegacyMailViewMode();
			purgeObsoleteSettings();
		}

		this.blockExternalContent = readBlockExternal();
		this.autoLoadMore = readAutoLoadMore();
		this.showSenderEmailInList = readShowSenderEmailInList();
		this.showImportantColors = readShowImportantColors();
		this.preferPlainText = readPreferPlainText();
		this.collapseQuotedInCompose = readCollapseQuotedInCompose();
		this.expandAllThreadMessages = readExpandAllThreadMessages();
		this.hideComposeHints = readHideComposeHints();
		this.showComposeContactSuggestions = readShowComposeContactSuggestions();
		this.showCcBccInCompose = readShowCcBccInCompose();
		this.reduceMotion = readReduceMotion();
		this.rememberLastMailbox = readRememberLastMailbox();
		this.showReaderListRail = readShowReaderListRail();
		this.enableKeyboardShortcuts = readEnableKeyboardShortcuts();
		this.confirmBeforeDelete = readConfirmBeforeDelete();
		this.confirmBeforeDiscardCompose = readConfirmBeforeDiscardCompose();
		this.undoSendDelay = readUndoSendDelay();
		this.readerTextSize = readReaderTextSize();
		this.readingTypeface = readReadingTypeface();
		this.readerCleanView = readReaderCleanView();
		this.focusReadingDefault = readFocusReadingDefault();
		this.defaultReplyMode = readDefaultReplyMode();
		this.defaultComposeFormat = readDefaultComposeFormat();
		this.showUnreadInTitle = readShowUnreadInTitle();
		this.showUnreadAppBadge = readShowUnreadAppBadge();
		this.notifyOnNewMail = readNotifyOnNewMail();
		this.bccSelf = readBccSelf();
		this.timeFormat = readTimeFormat();
		this.searchScope = readSearchScope();
		this.hideActionToasts = readHideActionToasts();
		this.calendarWeekStartsOnMonday = readCalendarWeekStartsOnMonday();
		this.hideCalendarEventTimes = readHideCalendarEventTimes();
		this.calendarMaxEventsPerDay = readCalendarMaxEventsPerDay();

		this.applyReduceMotion();
		this.applyReaderTextSize(this.readerTextSize);
		this.applyReadingTypeface(this.readingTypeface);
		importantRainbow.reload();
	}

	setUser(email: string | null) {
		this.userEmail = email;
		setSyncAccountEmail(email);
		this.displayName = readDisplayName(email);
		this.signature = readSignature(email);
		this.useSignature = readUseSignature(email);
	}

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

	async syncFromAccount(): Promise<void> {
		if (!this.userEmail) return;

		const result = await pullAccountSettings(this.userEmail, () => this.init());
		if (result === 'applied') {
			void import('$lib/stores/theme.svelte').then(({ theme }) => theme.init());
		} else if (result === 'empty') {
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
		if (browser) this.writeStorage(STORAGE.blockExternal, String(value));
	}

	setAutoLoadMore(value: boolean) {
		this.autoLoadMore = value;
		if (browser) this.writeStorage(STORAGE.autoLoadMore, String(value));
	}

	setShowSenderEmailInList(value: boolean) {
		this.showSenderEmailInList = value;
		if (browser) this.writeStorage(STORAGE.showSenderEmailInList, String(value));
	}

	setShowImportantColors(value: boolean) {
		this.showImportantColors = value;
		if (browser) this.writeStorage(STORAGE.showImportantColors, String(value));
	}

	setPreferPlainText(value: boolean) {
		this.preferPlainText = value;
		if (browser) this.writeStorage(STORAGE.preferPlainText, String(value));
	}

	setCollapseQuotedInCompose(value: boolean) {
		this.collapseQuotedInCompose = value;
		if (browser) this.writeStorage(STORAGE.collapseQuotedInCompose, String(value));
	}

	setExpandAllThreadMessages(value: boolean) {
		this.expandAllThreadMessages = value;
		if (browser) this.writeStorage(STORAGE.expandAllThreadMessages, String(value));
	}

	setHideComposeHints(value: boolean) {
		this.hideComposeHints = value;
		if (browser) this.writeStorage(STORAGE.hideComposeHints, String(value));
	}

	setShowComposeContactSuggestions(value: boolean) {
		this.showComposeContactSuggestions = value;
		if (browser) this.writeStorage(STORAGE.showComposeContactSuggestions, String(value));
	}

	setShowCcBccInCompose(value: boolean) {
		this.showCcBccInCompose = value;
		if (browser) this.writeStorage(STORAGE.showCcBccInCompose, String(value));
	}

	setReduceMotion(value: boolean) {
		this.reduceMotion = value;
		if (browser) this.writeStorage(STORAGE.reduceMotion, String(value));
		this.applyReduceMotion();
	}

	setRememberLastMailbox(value: boolean) {
		this.rememberLastMailbox = value;
		if (browser) this.writeStorage(STORAGE.rememberLastMailbox, String(value));
	}

	setLastMailbox(routeId: string) {
		if (!browser) return;
		const trimmed = routeId.trim();
		if (trimmed) {
			this.writeStorage(STORAGE.lastMailbox, trimmed);
		}
	}

	preferredMailHref(): string {
		const routeId = this.rememberLastMailbox ? readLastMailbox() : INBOX_MAILBOX_ROUTE_ID;
		return mailListHref(routeId);
	}

	setShowReaderListRail(value: boolean) {
		this.showReaderListRail = value;
		if (browser) this.writeStorage(STORAGE.showReaderListRail, String(value));
	}

	setEnableKeyboardShortcuts(value: boolean) {
		this.enableKeyboardShortcuts = value;
		if (browser) this.writeStorage(STORAGE.enableKeyboardShortcuts, String(value));
	}

	setConfirmBeforeDelete(value: boolean) {
		this.confirmBeforeDelete = value;
		if (browser) this.writeStorage(STORAGE.confirmBeforeDelete, String(value));
	}

	setConfirmBeforeDiscardCompose(value: boolean) {
		this.confirmBeforeDiscardCompose = value;
		if (browser) this.writeStorage(STORAGE.confirmBeforeDiscardCompose, String(value));
	}

	setUndoSendDelay(value: UndoSendDelay) {
		this.undoSendDelay = value;
		if (browser) this.writeStorage(STORAGE.undoSendDelay, String(value));
	}

	setReaderTextSize(value: ReaderTextSize) {
		this.readerTextSize = value;
		if (browser) this.writeStorage(STORAGE.readerTextSize, value);
		this.applyReaderTextSize(value);
	}

	setReadingTypeface(value: ReadingTypeface) {
		this.readingTypeface = value;
		if (browser) this.writeStorage(STORAGE.readingTypeface, value);
		this.applyReadingTypeface(value);
	}

	setReaderCleanView(value: boolean) {
		this.readerCleanView = value;
		if (browser) this.writeStorage(STORAGE.readerCleanView, String(value));
	}

	setFocusReadingDefault(value: boolean) {
		this.focusReadingDefault = value;
		if (browser) this.writeStorage(STORAGE.focusReadingDefault, String(value));
	}

	setDefaultReplyMode(value: DefaultReplyMode) {
		this.defaultReplyMode = value;
		if (browser) this.writeStorage(STORAGE.defaultReplyMode, value);
	}

	setDefaultComposeFormat(value: ComposeFormat) {
		this.defaultComposeFormat = value;
		if (browser) this.writeStorage(STORAGE.defaultComposeFormat, value);
	}

	setUseSignature(value: boolean) {
		this.useSignature = value;
		if (!browser || !this.userEmail) return;
		this.writeStorage(STORAGE.useSignature(this.userEmail), String(value));
	}

	setShowUnreadInTitle(value: boolean) {
		this.showUnreadInTitle = value;
		if (browser) {
			this.writeStorage(STORAGE.showUnreadInTitle, String(value));
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

	setNotifyOnNewMail(value: boolean): Promise<boolean> | undefined {
		this.notifyOnNewMail = value;
		if (browser) {
			this.writeStorage(STORAGE.notifyOnNewMail, String(value));
			if (value) void requestBrowserNotificationPermission();
			return syncPushSubscription(value);
		}
	}

	setBccSelf(value: boolean) {
		this.bccSelf = value;
		if (browser) this.writeStorage(STORAGE.bccSelf, String(value));
	}

	setTimeFormat(value: TimeFormat) {
		this.timeFormat = value;
		if (browser) this.writeStorage(STORAGE.timeFormat, value);
	}

	setSearchScope(value: SearchScope) {
		this.searchScope = value;
		if (browser) this.writeStorage(STORAGE.searchScope, value);
	}

	setHideActionToasts(value: boolean) {
		this.hideActionToasts = value;
		if (browser) this.writeStorage(STORAGE.hideActionToasts, String(value));
	}

	setCalendarWeekStartsOnMonday(value: boolean) {
		this.calendarWeekStartsOnMonday = value;
		if (browser) this.writeStorage(STORAGE.calendarWeekStartsOnMonday, String(value));
	}

	setHideCalendarEventTimes(value: boolean) {
		this.hideCalendarEventTimes = value;
		if (browser) this.writeStorage(STORAGE.hideCalendarEventTimes, String(value));
	}

	setCalendarMaxEventsPerDay(value: CalendarMaxEventsPerDay) {
		this.calendarMaxEventsPerDay = value;
		if (browser) this.writeStorage(STORAGE.calendarMaxEventsPerDay, String(value));
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

	resetAppearanceSettings() {
		void import('$lib/stores/theme.svelte').then(({ theme }) => theme.set('system'));
		this.setReduceMotion(false);
	}

	resetReadingSettings() {
		this.setNotifyOnNewMail(true);
		this.setShowUnreadInTitle(true);
		this.setShowUnreadAppBadge(true);
		this.setShowSenderEmailInList(false);
		this.setShowImportantColors(true);
		this.setRememberLastMailbox(false);
		this.setReaderTextSize('normal');
		this.setReadingTypeface('sans');
		this.setReaderCleanView(true);
		this.setPreferPlainText(false);
		this.setBlockExternalContent(true);
		this.setExpandAllThreadMessages(false);
		this.setConfirmBeforeDelete(true);
		this.setHideActionToasts(false);
		this.setTimeFormat('auto');
		this.setEnableKeyboardShortcuts(true);
	}

	resetWritingSettings() {
		this.setDefaultComposeFormat('plain');
		this.setShowCcBccInCompose(true);
		this.setShowComposeContactSuggestions(true);
		this.setBccSelf(false);
		this.setCollapseQuotedInCompose(false);
		this.setHideComposeHints(false);
		this.setDefaultReplyMode('reply');
		this.setConfirmBeforeDiscardCompose(true);
		this.setUndoSendDelay(5000);
	}

	resetCalendarSettings() {
		this.setCalendarWeekStartsOnMonday(false);
		this.setCalendarMaxEventsPerDay(3);
		this.setHideCalendarEventTimes(false);
	}

	resetAccountSettings() {
		this.setDisplayName('');
		this.setSignature('');
		this.setUseSignature(true);
	}

	resetAllSettings() {
		this.resetAppearanceSettings();
		this.resetReadingSettings();
		this.resetWritingSettings();
		this.resetCalendarSettings();
	}

	exportLocalPreferences(): string {
		if (!browser) return '{}';

		return JSON.stringify(
			{ version: 2, exportedAt: new Date().toISOString(), settings: collectSyncableSettings() },
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

	private applyReaderTextSize(value: ReaderTextSize) {
		if (!browser) return;
		document.documentElement.style.setProperty('--z-reader-text', READER_TEXT_SIZE[value]);
		document.documentElement.style.setProperty('--z-reader-leading', READER_LEADING[value]);
	}

	private applyReadingTypeface(value: ReadingTypeface) {
		if (!browser) return;
		document.documentElement.style.setProperty('--z-reader-font', READING_FONT[value]);
	}
}

export const settings = new SettingsStore();
