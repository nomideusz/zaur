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
	showQuickReply: 'zaur:show-quick-reply',
	showReaderContactActions: 'zaur:show-reader-contact-actions',
	expandAllThreadMessages: 'zaur:expand-all-thread-messages',
	hideSidebarShortcuts: 'zaur:hide-sidebar-shortcuts',
	expandListUntilOpen: 'zaur:expand-list-until-open',
	mailOnlyNavigation: 'zaur:mail-only-navigation',
	enableKeyboardShortcuts: 'zaur:enable-keyboard-shortcuts',
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
	showQuickReply = $state(readShowQuickReply());
	showReaderContactActions = $state(readShowReaderContactActions());
	expandAllThreadMessages = $state(readExpandAllThreadMessages());
	hideSidebarShortcuts = $state(readHideSidebarShortcuts());
	expandListUntilOpen = $state(readExpandListUntilOpen());
	mailOnlyNavigation = $state(readMailOnlyNavigation());
	enableKeyboardShortcuts = $state(readEnableKeyboardShortcuts());
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
		this.showQuickReply = readShowQuickReply();
		this.showReaderContactActions = readShowReaderContactActions();
		this.expandAllThreadMessages = readExpandAllThreadMessages();
		this.hideSidebarShortcuts = readHideSidebarShortcuts();
		this.expandListUntilOpen = readExpandListUntilOpen();
		this.mailOnlyNavigation = readMailOnlyNavigation();
		this.enableKeyboardShortcuts = readEnableKeyboardShortcuts();
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
