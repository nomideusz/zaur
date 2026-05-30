export type SettingsSearchEntry = {
	id: string;
	title: string;
	description: string;
	href: string;
};

export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] = [
	{
		"id": "/settings/account-clear-local-cache",
		"href": "/settings/account",
		"title": "Clear local cache",
		"description": ""
	},
	{
		"id": "/settings/account-display-name",
		"href": "/settings/account",
		"title": "Display name",
		"description": ""
	},
	{
		"id": "/settings/account-empty-spam",
		"href": "/settings/account",
		"title": "Empty Spam",
		"description": ""
	},
	{
		"id": "/settings/account-empty-trash",
		"href": "/settings/account",
		"title": "Empty Trash",
		"description": ""
	},
	{
		"id": "/settings/account-include-signature",
		"href": "/settings/account",
		"title": "Include signature",
		"description": ""
	},
	{
		"id": "/settings/account-jmap-server",
		"href": "/settings/account",
		"title": "JMAP server",
		"description": ""
	},
	{
		"id": "/settings/account-primary-address",
		"href": "/settings/account",
		"title": "Primary address",
		"description": ""
	},
	{
		"id": "/settings/account-refresh-from-account",
		"href": "/settings/account",
		"title": "Refresh from account",
		"description": ""
	},
	{
		"id": "/settings/account-reset-profile",
		"href": "/settings/account",
		"title": "Reset profile",
		"description": ""
	},
	{
		"id": "/settings/account-save-to-account",
		"href": "/settings/account",
		"title": "Save to account",
		"description": ""
	},
	{
		"id": "/settings/account-session",
		"href": "/settings/account",
		"title": "Session",
		"description": ""
	},
	{
		"id": "/settings/account-sign-out",
		"href": "/settings/account",
		"title": "Sign out",
		"description": ""
	},
	{
		"id": "/settings/account-signature",
		"href": "/settings/account",
		"title": "Signature",
		"description": ""
	},
	{
		"id": "/settings/appearance-accent-color",
		"href": "/settings/appearance",
		"title": "Accent color",
		"description": ""
	},
	{
		"id": "/settings/appearance-color-mode",
		"href": "/settings/appearance",
		"title": "Color mode",
		"description": ""
	},
	{
		"id": "/settings/appearance-corner-style",
		"href": "/settings/appearance",
		"title": "Corner style",
		"description": ""
	},
	{
		"id": "/settings/appearance-reduce-motion",
		"href": "/settings/appearance",
		"title": "Reduce motion",
		"description": ""
	},
	{
		"id": "/settings/appearance-reset-theme-settings",
		"href": "/settings/appearance",
		"title": "Reset theme settings",
		"description": ""
	},
	{
		"id": "/settings/appearance-surface-tone",
		"href": "/settings/appearance",
		"title": "Surface tone",
		"description": ""
	},
	{
		"id": "/settings/calendar-events-per-day",
		"href": "/settings/calendar",
		"title": "Events per day",
		"description": ""
	},
	{
		"id": "/settings/calendar-reset-calendar-settings",
		"href": "/settings/calendar",
		"title": "Reset calendar settings",
		"description": ""
	},
	{
		"id": "/settings/calendar-show-event-times",
		"href": "/settings/calendar",
		"title": "Show event times",
		"description": ""
	},
	{
		"id": "/settings/calendar-week-starts-on-monday",
		"href": "/settings/calendar",
		"title": "Week starts on Monday",
		"description": ""
	},
	{
		"id": "/settings/compose-always-bcc-me",
		"href": "/settings/compose",
		"title": "Always Bcc me",
		"description": ""
	},
	{
		"id": "/settings/compose-auto-archive-after-reply",
		"href": "/settings/compose",
		"title": "Auto-archive after reply",
		"description": ""
	},
	{
		"id": "/settings/compose-collapse-quoted-text",
		"href": "/settings/compose",
		"title": "Collapse quoted text",
		"description": ""
	},
	{
		"id": "/settings/compose-compose-layout",
		"href": "/settings/compose",
		"title": "Compose layout",
		"description": ""
	},
	{
		"id": "/settings/compose-contact-suggestions",
		"href": "/settings/compose",
		"title": "Contact suggestions",
		"description": ""
	},
	{
		"id": "/settings/compose-default-format",
		"href": "/settings/compose",
		"title": "Default format",
		"description": ""
	},
	{
		"id": "/settings/compose-drawer-width",
		"href": "/settings/compose",
		"title": "Drawer width",
		"description": ""
	},
	{
		"id": "/settings/compose-hide-compose-hints",
		"href": "/settings/compose",
		"title": "Hide compose hints",
		"description": ""
	},
	{
		"id": "/settings/compose-reset-writing-settings",
		"href": "/settings/compose",
		"title": "Reset writing settings",
		"description": ""
	},
	{
		"id": "/settings/compose-show-cc-bcc",
		"href": "/settings/compose",
		"title": "Show Cc/Bcc",
		"description": ""
	},
	{
		"id": "/settings/data-export-settings",
		"href": "/settings/data",
		"title": "Export settings",
		"description": ""
	},
	{
		"id": "/settings/data-import-settings",
		"href": "/settings/data",
		"title": "Import settings",
		"description": ""
	},
	{
		"id": "/settings/data-reset-all-display-layout-settings",
		"href": "/settings/data",
		"title": "Reset all display & layout settings",
		"description": ""
	},
	{
		"id": "/settings/inbox-enable-bulk-select",
		"href": "/settings/inbox",
		"title": "Enable bulk select",
		"description": ""
	},
	{
		"id": "/settings/inbox-full-dates",
		"href": "/settings/inbox",
		"title": "Full dates",
		"description": ""
	},
	{
		"id": "/settings/inbox-highlight-unread",
		"href": "/settings/inbox",
		"title": "Highlight unread",
		"description": ""
	},
	{
		"id": "/settings/inbox-list-density",
		"href": "/settings/inbox",
		"title": "List density",
		"description": ""
	},
	{
		"id": "/settings/inbox-reset-inbox-settings",
		"href": "/settings/inbox",
		"title": "Reset inbox settings",
		"description": ""
	},
	{
		"id": "/settings/inbox-show-message-preview",
		"href": "/settings/inbox",
		"title": "Show message preview",
		"description": ""
	},
	{
		"id": "/settings/inbox-text-size",
		"href": "/settings/inbox",
		"title": "Text size",
		"description": ""
	},
	{
		"id": "/settings/inbox-timestamps",
		"href": "/settings/inbox",
		"title": "Timestamps",
		"description": ""
	},
	{
		"id": "/settings/layout-default-search-scope",
		"href": "/settings/layout",
		"title": "Default search scope",
		"description": ""
	},
	{
		"id": "/settings/layout-mail-view",
		"href": "/settings/layout",
		"title": "Mail view",
		"description": ""
	},
	{
		"id": "/settings/layout-remember-last-mailbox",
		"href": "/settings/layout",
		"title": "Remember last mailbox",
		"description": ""
	},
	{
		"id": "/settings/layout-reset-layout-settings",
		"href": "/settings/layout",
		"title": "Reset layout settings",
		"description": ""
	},
	{
		"id": "/settings/layout-show-folder-unread-counts",
		"href": "/settings/layout",
		"title": "Show folder unread counts",
		"description": ""
	},
	{
		"id": "/settings/layout-show-pane-borders",
		"href": "/settings/layout",
		"title": "Show pane borders",
		"description": ""
	},
	{
		"id": "/settings/mail-app-install",
		"href": "/settings/mail",
		"title": "App install",
		"description": ""
	},
	{
		"id": "/settings/mail-archive-unread-delete",
		"href": "/settings/mail",
		"title": "Archive / unread / delete",
		"description": ""
	},
	{
		"id": "/settings/mail-auto-load-more-messages",
		"href": "/settings/mail",
		"title": "Auto-load more messages",
		"description": ""
	},
	{
		"id": "/settings/mail-compose",
		"href": "/settings/mail",
		"title": "Compose",
		"description": ""
	},
	{
		"id": "/settings/mail-confirm-before-delete",
		"href": "/settings/mail",
		"title": "Confirm before delete",
		"description": ""
	},
	{
		"id": "/settings/mail-confirm-before-discarding-compose",
		"href": "/settings/mail",
		"title": "Confirm before discarding compose",
		"description": ""
	},
	{
		"id": "/settings/mail-enable-keyboard-shortcuts",
		"href": "/settings/mail",
		"title": "Enable keyboard shortcuts",
		"description": ""
	},
	{
		"id": "/settings/mail-focus-mode-return-to-list",
		"href": "/settings/mail",
		"title": "Focus mode / return to list",
		"description": ""
	},
	{
		"id": "/settings/mail-go-to-folder",
		"href": "/settings/mail",
		"title": "Go to folder",
		"description": ""
	},
	{
		"id": "/settings/mail-hide-action-toasts",
		"href": "/settings/mail",
		"title": "Hide action toasts",
		"description": ""
	},
	{
		"id": "/settings/mail-mark-as-read-delay",
		"href": "/settings/mail",
		"title": "Mark-as-read delay",
		"description": ""
	},
	{
		"id": "/settings/mail-mark-as-read-when-opened",
		"href": "/settings/mail",
		"title": "Mark as read when opened",
		"description": ""
	},
	{
		"id": "/settings/mail-next-previous-message",
		"href": "/settings/mail",
		"title": "Next / previous message",
		"description": ""
	},
	{
		"id": "/settings/mail-notify-on-new-mail",
		"href": "/settings/mail",
		"title": "Notify on new mail",
		"description": ""
	},
	{
		"id": "/settings/mail-push-notifications",
		"href": "/settings/mail",
		"title": "Push notifications",
		"description": ""
	},
	{
		"id": "/settings/mail-reply-reply-all",
		"href": "/settings/mail",
		"title": "Reply / reply all",
		"description": ""
	},
	{
		"id": "/settings/mail-reset-general-mail-settings",
		"href": "/settings/mail",
		"title": "Reset general mail settings",
		"description": ""
	},
	{
		"id": "/settings/mail-return-to-inbox-after-sending",
		"href": "/settings/mail",
		"title": "Return to inbox after sending",
		"description": ""
	},
	{
		"id": "/settings/mail-search",
		"href": "/settings/mail",
		"title": "Search",
		"description": ""
	},
	{
		"id": "/settings/mail-send-close-compose",
		"href": "/settings/mail",
		"title": "Send / close compose",
		"description": ""
	},
	{
		"id": "/settings/mail-time-format",
		"href": "/settings/mail",
		"title": "Time format",
		"description": ""
	},
	{
		"id": "/settings/mail-undo-send",
		"href": "/settings/mail",
		"title": "Undo send",
		"description": ""
	},
	{
		"id": "/settings/mail-unread-count-in-tab-title",
		"href": "/settings/mail",
		"title": "Unread count in tab title",
		"description": ""
	},
	{
		"id": "/settings/mail-unread-count-on-app-icon",
		"href": "/settings/mail",
		"title": "Unread count on app icon",
		"description": ""
	},
	{
		"id": "/settings/reading-block-external-content",
		"href": "/settings/reading",
		"title": "Block external content",
		"description": ""
	},
	{
		"id": "/settings/reading-default-reply-action",
		"href": "/settings/reading",
		"title": "Default reply action",
		"description": ""
	},
	{
		"id": "/settings/reading-flag-external-senders",
		"href": "/settings/reading",
		"title": "Flag external senders",
		"description": ""
	},
	{
		"id": "/settings/reading-reading-size",
		"href": "/settings/reading",
		"title": "Reading size",
		"description": ""
	},
	{
		"id": "/settings/reading-reading-width",
		"href": "/settings/reading",
		"title": "Reading width",
		"description": ""
	},
	{
		"id": "/settings/reading-reset-reading-settings",
		"href": "/settings/reading",
		"title": "Reset reading settings",
		"description": ""
	}
];
