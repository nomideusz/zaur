export type SettingsSearchEntry = {
	id: string;
	title: string;
	description: string;
	href: string;
	modes?: ('simple' | 'traditional')[];
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
		"id": "/settings/reading-app-install",
		"href": "/settings/reading",
		"title": "App install",
		"description": ""
	},
	{
		"id": "/settings/reading-archive-unread-delete",
		"href": "/settings/reading",
		"title": "Archive / unread / delete",
		"description": ""
	},
	{
		"id": "/settings/reading-auto-load-more-messages",
		"href": "/settings/reading",
		"title": "Auto-load more messages",
		"description": ""
	},
	{
		"id": "/settings/reading-block-external-content",
		"href": "/settings/reading",
		"title": "Block external content",
		"description": ""
	},
	{
		"id": "/settings/reading-compose",
		"href": "/settings/reading",
		"title": "Compose",
		"description": ""
	},
	{
		"id": "/settings/reading-confirm-before-delete",
		"href": "/settings/reading",
		"title": "Confirm before delete",
		"description": ""
	},
	{
		"id": "/settings/reading-default-search-scope",
		"href": "/settings/reading",
		"title": "Default search scope",
		"description": "",
		"modes": [
			"simple"
		]
	},
	{
		"id": "/settings/reading-enable-keyboard-shortcuts",
		"href": "/settings/reading",
		"title": "Enable keyboard shortcuts",
		"description": ""
	},
	{
		"id": "/settings/reading-focus-mode-return-to-list",
		"href": "/settings/reading",
		"title": "Focus mode / return to list",
		"description": ""
	},
	{
		"id": "/settings/reading-go-to-folder",
		"href": "/settings/reading",
		"title": "Go to folder",
		"description": ""
	},
	{
		"id": "/settings/reading-hide-action-toasts",
		"href": "/settings/reading",
		"title": "Hide action toasts",
		"description": ""
	},
	{
		"id": "/settings/reading-list-text-size",
		"href": "/settings/reading",
		"title": "List text size",
		"description": ""
	},
	{
		"id": "/settings/reading-mark-as-read-delay",
		"href": "/settings/reading",
		"title": "Mark-as-read delay",
		"description": ""
	},
	{
		"id": "/settings/reading-mark-as-read-when-opened",
		"href": "/settings/reading",
		"title": "Mark as read when opened",
		"description": ""
	},
	{
		"id": "/settings/reading-next-previous-message",
		"href": "/settings/reading",
		"title": "Next / previous message",
		"description": ""
	},
	{
		"id": "/settings/reading-push-notifications",
		"href": "/settings/reading",
		"title": "Push notifications",
		"description": ""
	},
	{
		"id": "/settings/reading-reading-text-size",
		"href": "/settings/reading",
		"title": "Reading text size",
		"description": ""
	},
	{
		"id": "/settings/reading-remember-last-mailbox",
		"href": "/settings/reading",
		"title": "Remember last mailbox",
		"description": "",
		"modes": [
			"simple"
		]
	},
	{
		"id": "/settings/reading-reply-reply-all",
		"href": "/settings/reading",
		"title": "Reply / reply all",
		"description": ""
	},
	{
		"id": "/settings/reading-reset-layout-settings",
		"href": "/settings/reading",
		"title": "Reset layout settings",
		"description": "",
		"modes": [
			"traditional"
		]
	},
	{
		"id": "/settings/reading-reset-reading-settings",
		"href": "/settings/reading",
		"title": "Reset reading settings",
		"description": "",
		"modes": [
			"simple"
		]
	},
	{
		"id": "/settings/reading-send-close-compose",
		"href": "/settings/reading",
		"title": "Send / close compose",
		"description": ""
	},
	{
		"id": "/settings/reading-show-folder-unread-counts",
		"href": "/settings/reading",
		"title": "Show folder unread counts",
		"description": "",
		"modes": [
			"traditional"
		]
	},
	{
		"id": "/settings/reading-show-list-rail-in-reader",
		"href": "/settings/reading",
		"title": "Show list rail in reader",
		"description": "",
		"modes": [
			"simple"
		]
	},
	{
		"id": "/settings/reading-show-message-preview",
		"href": "/settings/reading",
		"title": "Show message preview",
		"description": ""
	},
	{
		"id": "/settings/reading-show-pane-borders",
		"href": "/settings/reading",
		"title": "Show pane borders",
		"description": "",
		"modes": [
			"traditional"
		]
	},
	{
		"id": "/settings/reading-time-format",
		"href": "/settings/reading",
		"title": "Time format",
		"description": ""
	},
	{
		"id": "/settings/reading-timestamps",
		"href": "/settings/reading",
		"title": "Timestamps",
		"description": ""
	},
	{
		"id": "/settings/reading-unread-count-in-tab-title",
		"href": "/settings/reading",
		"title": "Unread count in tab title",
		"description": ""
	},
	{
		"id": "/settings/reading-unread-count-on-app-icon",
		"href": "/settings/reading",
		"title": "Unread count on app icon",
		"description": ""
	},
	{
		"id": "/settings/writing-always-bcc-me",
		"href": "/settings/writing",
		"title": "Always Bcc me",
		"description": ""
	},
	{
		"id": "/settings/writing-auto-archive-after-reply",
		"href": "/settings/writing",
		"title": "Auto-archive after reply",
		"description": ""
	},
	{
		"id": "/settings/writing-collapse-quoted-text",
		"href": "/settings/writing",
		"title": "Collapse quoted text",
		"description": ""
	},
	{
		"id": "/settings/writing-confirm-before-discarding-compose",
		"href": "/settings/writing",
		"title": "Confirm before discarding compose",
		"description": ""
	},
	{
		"id": "/settings/writing-contact-suggestions",
		"href": "/settings/writing",
		"title": "Contact suggestions",
		"description": ""
	},
	{
		"id": "/settings/writing-default-format",
		"href": "/settings/writing",
		"title": "Default format",
		"description": ""
	},
	{
		"id": "/settings/writing-default-reply-action",
		"href": "/settings/writing",
		"title": "Default reply action",
		"description": ""
	},
	{
		"id": "/settings/writing-hide-compose-hints",
		"href": "/settings/writing",
		"title": "Hide compose hints",
		"description": ""
	},
	{
		"id": "/settings/writing-reset-writing-settings",
		"href": "/settings/writing",
		"title": "Reset writing settings",
		"description": ""
	},
	{
		"id": "/settings/writing-return-to-inbox-after-sending",
		"href": "/settings/writing",
		"title": "Return to inbox after sending",
		"description": ""
	},
	{
		"id": "/settings/writing-show-cc-bcc",
		"href": "/settings/writing",
		"title": "Show Cc/Bcc",
		"description": ""
	},
	{
		"id": "/settings/writing-undo-send",
		"href": "/settings/writing",
		"title": "Undo send",
		"description": ""
	}
];
