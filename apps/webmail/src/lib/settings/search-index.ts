export type SettingsSearchEntry = {
	id: string;
	title: string;
	description: string;
	href: string;
};

export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] = [
	{
		"id": "/settings/account-add-account",
		"href": "/settings/account",
		"title": "Add account",
		"description": "Sign in to another mailbox."
	},
	{
		"id": "/settings/account-app-install",
		"href": "/settings/account",
		"title": "App install",
		"description": "Install ZAUR as an app on this device for a standalone window."
	},
	{
		"id": "/settings/account-appearance",
		"href": "/settings/account",
		"title": "Appearance",
		"description": ""
	},
	{
		"id": "/settings/account-clear-local-cache",
		"href": "/settings/account",
		"title": "Clear local cache",
		"description": "Remove downloaded mail and sync state from this device. Your mail on the server is untouched."
	},
	{
		"id": "/settings/account-confirm-before-delete",
		"href": "/settings/account",
		"title": "Confirm before delete",
		"description": "Ask before moving messages to the Trash."
	},
	{
		"id": "/settings/account-display-name",
		"href": "/settings/account",
		"title": "Display name",
		"description": "Shown to recipients on messages you send."
	},
	{
		"id": "/settings/account-empty-spam",
		"href": "/settings/account",
		"title": "Empty Spam",
		"description": "Permanently delete every message in the Spam folder."
	},
	{
		"id": "/settings/account-empty-trash",
		"href": "/settings/account",
		"title": "Empty Trash",
		"description": "Permanently delete every message in the Trash folder."
	},
	{
		"id": "/settings/account-events-per-day-in-month-view",
		"href": "/settings/account",
		"title": "Events per day in month view",
		"description": "How many events to list under a day before the rest collapse into a count."
	},
	{
		"id": "/settings/account-export-settings",
		"href": "/settings/account",
		"title": "Export settings",
		"description": "Download your preferences as a JSON file."
	},
	{
		"id": "/settings/account-hide-action-toasts",
		"href": "/settings/account",
		"title": "Hide action toasts",
		"description": "Stop showing the brief confirmations that pop up after actions."
	},
	{
		"id": "/settings/account-hide-event-times",
		"href": "/settings/account",
		"title": "Hide event times",
		"description": "Show events by title only, without their start and end times."
	},
	{
		"id": "/settings/account-import-settings",
		"href": "/settings/account",
		"title": "Import settings",
		"description": "Load preferences from a previously exported file."
	},
	{
		"id": "/settings/account-include-signature",
		"href": "/settings/account",
		"title": "Include signature",
		"description": "Add your signature when composing."
	},
	{
		"id": "/settings/account-jmap-server",
		"href": "/settings/account",
		"title": "JMAP server",
		"description": "The mail server this app syncs with."
	},
	{
		"id": "/settings/account-passkey",
		"href": "/settings/account",
		"title": "Passkey",
		"description": "Sign in with your device's biometrics or PIN instead of a password."
	},
	{
		"id": "/settings/account-primary-address",
		"href": "/settings/account",
		"title": "Primary address",
		"description": ""
	},
	{
		"id": "/settings/account-push-notifications",
		"href": "/settings/account",
		"title": "Push notifications",
		"description": "Get notified about new mail even when ZAUR isn't open."
	},
	{
		"id": "/settings/account-reduce-motion",
		"href": "/settings/account",
		"title": "Reduce motion",
		"description": "Minimize animations and transitions throughout the app."
	},
	{
		"id": "/settings/account-reset-preferences",
		"href": "/settings/account",
		"title": "Reset preferences",
		"description": "Restore all settings to their defaults. Your display name and signature are kept."
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
		"description": "Sign out of ZAUR Webmail on this device."
	},
	{
		"id": "/settings/account-sign-out-of-this-account",
		"href": "/settings/account",
		"title": "Sign out of this account",
		"description": "Keep your other accounts signed in."
	},
	{
		"id": "/settings/account-signature",
		"href": "/settings/account",
		"title": "Signature",
		"description": "Appended to the bottom of new messages."
	},
	{
		"id": "/settings/account-sync-now",
		"href": "/settings/account",
		"title": "Sync now",
		"description": "Force an immediate sync with your account instead of waiting for the automatic one."
	},
	{
		"id": "/settings/account-unseen-count-in-tab-title",
		"href": "/settings/account",
		"title": "Unseen count in tab title",
		"description": "Show the number of unread messages in the browser tab title."
	},
	{
		"id": "/settings/account-unseen-count-on-app-icon",
		"href": "/settings/account",
		"title": "Unseen count on app icon",
		"description": "Show the number of unread messages as a badge on the installed app's icon."
	},
	{
		"id": "/settings/account-week-starts-on-monday",
		"href": "/settings/account",
		"title": "Week starts on Monday",
		"description": "Begin each calendar week on Monday instead of Sunday."
	},
	{
		"id": "/settings/compose-always-bcc-me",
		"href": "/settings/compose",
		"title": "Always Bcc me",
		"description": "Send yourself a blind copy of every message you send."
	},
	{
		"id": "/settings/compose-collapse-quoted-text",
		"href": "/settings/compose",
		"title": "Collapse quoted text",
		"description": "Start replies with the quoted original folded out of the way."
	},
	{
		"id": "/settings/compose-confirm-before-discard",
		"href": "/settings/compose",
		"title": "Confirm before discard",
		"description": "Ask before throwing away a draft that has unsaved changes."
	},
	{
		"id": "/settings/compose-contact-suggestions",
		"href": "/settings/compose",
		"title": "Contact suggestions",
		"description": "Suggest matching addresses from your contacts as you type recipients."
	},
	{
		"id": "/settings/compose-default-format",
		"href": "/settings/compose",
		"title": "Default format",
		"description": "The format new messages start in. HTML allows styling; plain text is simpler and lighter."
	},
	{
		"id": "/settings/compose-default-reply",
		"href": "/settings/compose",
		"title": "Default reply",
		"description": "Whether the reply button answers just the sender or everyone on the message."
	},
	{
		"id": "/settings/compose-hide-compose-hints",
		"href": "/settings/compose",
		"title": "Hide compose hints",
		"description": "Hide the inline tips shown while composing, such as why a message can't be sent yet."
	},
	{
		"id": "/settings/compose-show-cc-bcc",
		"href": "/settings/compose",
		"title": "Show Cc/Bcc",
		"description": "Always show the Cc and Bcc fields when composing, instead of on demand."
	},
	{
		"id": "/settings/compose-undo-send",
		"href": "/settings/compose",
		"title": "Undo send",
		"description": "Briefly hold sent messages so you can recall them before they leave."
	},
	{
		"id": "/settings/reading-block-remote-images",
		"href": "/settings/reading",
		"title": "Block remote images",
		"description": "Don't load images hosted elsewhere, which can signal when you open a message."
	},
	{
		"id": "/settings/reading-clean-reading-view",
		"href": "/settings/reading",
		"title": "Clean reading view",
		"description": "Strip senders' fonts, colors, and fixed widths so messages match your reading settings."
	},
	{
		"id": "/settings/reading-expand-all-threads",
		"href": "/settings/reading",
		"title": "Expand all threads",
		"description": "Open every message in a conversation instead of just the latest."
	},
	{
		"id": "/settings/reading-mark-as-read-when-opened",
		"href": "/settings/reading",
		"title": "Mark as read when opened",
		"description": "Clear the unread mark as soon as you open a message. Turn off to mark messages read yourself."
	},
	{
		"id": "/settings/reading-marker-colors-on-highlighted",
		"href": "/settings/reading",
		"title": "Marker colors on Highlighted",
		"description": "Tint subject lines with their marker color in the Highlighted view."
	},
	{
		"id": "/settings/reading-prefer-plain-text",
		"href": "/settings/reading",
		"title": "Prefer plain text",
		"description": "Show the plain-text version of a message when the sender provides one."
	},
	{
		"id": "/settings/reading-remember-last-folder",
		"href": "/settings/reading",
		"title": "Remember last folder",
		"description": "Reopen the folder you were last viewing instead of the Inbox."
	},
	{
		"id": "/settings/reading-show-delivery-address",
		"href": "/settings/reading",
		"title": "Show delivery address",
		"description": "Show which of your addresses a message was delivered to (its Delivered-To)."
	},
	{
		"id": "/settings/reading-show-sender-email-address",
		"href": "/settings/reading",
		"title": "Show sender email address",
		"description": "Show each sender's address beneath their name in the message list."
	},
	{
		"id": "/settings/reading-text-size",
		"href": "/settings/reading",
		"title": "Text size",
		"description": ""
	},
	{
		"id": "/settings/reading-time-format",
		"href": "/settings/reading",
		"title": "Time format",
		"description": ""
	},
	{
		"id": "/settings/reading-typeface",
		"href": "/settings/reading",
		"title": "Typeface",
		"description": ""
	},
	{
		"id": "/settings/shortcuts-enable-shortcuts",
		"href": "/settings/shortcuts",
		"title": "Enable shortcuts",
		"description": "Use the single-key shortcuts below to move around without the mouse."
	}
];
