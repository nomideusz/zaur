export type SettingsSearchEntry = {
	id: string;
	title: string;
	description: string;
	href: string;
};

export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] = [
	{
		"id": "/settings/appearance-accent-color",
		"href": "/settings/appearance",
		"title": "Accent color",
		"description": "Primary buttons, links, focus rings, and unread highlights"
	},
	{
		"id": "/settings/appearance-corner-style",
		"href": "/settings/appearance",
		"title": "Corner style",
		"description": "Roundness of buttons, inputs, and panels"
	},
	{
		"id": "/settings/appearance-surface-tone",
		"href": "/settings/appearance",
		"title": "Surface tone",
		"description": "Softer backgrounds and borders for a calmer, lower-contrast look"
	},
	{
		"id": "/settings/appearance-theme",
		"href": "/settings/appearance",
		"title": "Theme",
		"description": "Light, dark, or match your system — also in the account menu"
	},
	{
		"id": "/settings/appearance-reduce-motion",
		"href": "/settings/appearance",
		"title": "Reduce motion",
		"description": "Turn off page transitions, loading animations, and other motion effects"
	},
	{
		"id": "/settings/appearance-loading-indicator",
		"href": "/settings/appearance",
		"title": "Loading indicator",
		"description": "How loading placeholders appear in the message list, reader, and folder sidebar"
	},
	{
		"id": "/settings/appearance-compact-list-loading-skeleton",
		"href": "/settings/appearance",
		"title": "Compact list loading skeleton",
		"description": "Fewer and tighter placeholder rows while messages load"
	},
	{
		"id": "/settings/appearance-compact-reader-skeleton",
		"href": "/settings/appearance",
		"title": "Compact reader skeleton",
		"description": "Smaller placeholder layout while a message loads in the reading pane"
	},
	{
		"id": "/settings/appearance-compact-folder-loading-skeleton",
		"href": "/settings/appearance",
		"title": "Compact folder loading skeleton",
		"description": "Fewer and tighter placeholder rows while folders load in the sidebar"
	},
	{
		"id": "/settings/appearance-hide-connecting-screen",
		"href": "/settings/appearance",
		"title": "Hide connecting screen",
		"description": "Blank screen while restoring your session — no “Connecting…” message"
	},
	{
		"id": "/settings/appearance-reset-look-feel",
		"href": "/settings/appearance",
		"title": "Reset look & feel",
		"description": "Restore accent color, theme, motion, and loading options on this page"
	},
	{
		"id": "/settings/inbox-list-density",
		"href": "/settings/inbox",
		"title": "List density",
		"description": "Row height preset — turn off previews for a tighter list; compact list rows adds extra padding trim"
	},
	{
		"id": "/settings/inbox-show-message-preview",
		"href": "/settings/inbox",
		"title": "Show message preview",
		"description": "Second line under the subject in the inbox list"
	},
	{
		"id": "/settings/inbox-show-sender-avatars",
		"href": "/settings/inbox",
		"title": "Show sender avatars",
		"description": "Color initials beside each message — turn off for a simpler, text-only list"
	},
	{
		"id": "/settings/inbox-compact-list-avatars",
		"href": "/settings/inbox",
		"title": "Compact list avatars",
		"description": "Smaller sender avatars in the message list"
	},
	{
		"id": "/settings/inbox-show-stars-in-list",
		"href": "/settings/inbox",
		"title": "Show stars in list",
		"description": "Star icon beside starred messages in the inbox list"
	},
	{
		"id": "/settings/inbox-show-attachment-icons",
		"href": "/settings/inbox",
		"title": "Show attachment icons",
		"description": "Paperclip beside messages that include files"
	},
	{
		"id": "/settings/inbox-show-message-counts",
		"href": "/settings/inbox",
		"title": "Show message counts",
		"description": "Unread and total counts in the list header"
	},
	{
		"id": "/settings/inbox-show-full-dates-in-list",
		"href": "/settings/inbox",
		"title": "Show full dates in list",
		"description": "Use full date and time instead of compact labels like Mon or May 25"
	},
	{
		"id": "/settings/inbox-subject-only-list",
		"href": "/settings/inbox",
		"title": "Subject-only list",
		"description": "Show only the subject on each row — hides the sender line for a tighter inbox"
	},
	{
		"id": "/settings/inbox-show-sender-email-in-list",
		"href": "/settings/inbox",
		"title": "Show sender email in list",
		"description": "Use the email address instead of the sender name in each row"
	},
	{
		"id": "/settings/inbox-show-timestamps-in-list",
		"href": "/settings/inbox",
		"title": "Show timestamps in list",
		"description": "Date or time on the right side of each message row"
	},
	{
		"id": "/settings/inbox-highlight-unread-messages",
		"href": "/settings/inbox",
		"title": "Highlight unread messages",
		"description": "Bold text and unread dots in the message list"
	},
	{
		"id": "/settings/inbox-compact-list-rows",
		"href": "/settings/inbox",
		"title": "Compact list rows",
		"description": "Extra vertical padding trim on each row — stacks with list density above"
	},
	{
		"id": "/settings/inbox-hide-list-row-dividers",
		"href": "/settings/inbox",
		"title": "Hide list row dividers",
		"description": "Remove horizontal lines between messages in the inbox list"
	},
	{
		"id": "/settings/inbox-hide-active-message-indicator",
		"href": "/settings/inbox",
		"title": "Hide active message indicator",
		"description": "Remove the colored left border on the selected message in the list"
	},
	{
		"id": "/settings/inbox-show-bulk-select",
		"href": "/settings/inbox",
		"title": "Show bulk select",
		"description": "Checkbox in the list toolbar to enter selection mode and select multiple messages"
	},
	{
		"id": "/settings/inbox-hide-selection-hints",
		"href": "/settings/inbox",
		"title": "Hide selection hints",
		"description": "Remove the “Click messages to select” hint in bulk selection mode"
	},
	{
		"id": "/settings/inbox-icon-only-bulk-actions",
		"href": "/settings/inbox",
		"title": "Icon-only bulk actions",
		"description": "Show icons without labels on archive, move, and delete in selection mode"
	},
	{
		"id": "/settings/inbox-compact-bulk-toolbar",
		"href": "/settings/inbox",
		"title": "Compact bulk toolbar",
		"description": "Less height on the selection toolbar above the message list"
	},
	{
		"id": "/settings/inbox-hide-move-menu-labels",
		"href": "/settings/inbox",
		"title": "Hide move menu labels",
		"description": "Remove the “Move to” heading in folder move dropdowns — in the list toolbar and reading pane"
	},
	{
		"id": "/settings/inbox-compact-move-menu",
		"href": "/settings/inbox",
		"title": "Compact move menu",
		"description": "Tighter spacing in folder move dropdowns from the list toolbar and reading pane"
	},
	{
		"id": "/settings/inbox-hide-search-list-prefix",
		"href": "/settings/inbox",
		"title": "Hide search list prefix",
		"description": "Show the query alone in search results — no “Search:” label"
	},
	{
		"id": "/settings/inbox-hide-empty-list-hints",
		"href": "/settings/inbox",
		"title": "Hide empty list hints",
		"description": "Show only the primary empty-folder message — no icons or secondary hint text"
	},
	{
		"id": "/settings/inbox-hide-empty-list-actions",
		"href": "/settings/inbox",
		"title": "Hide empty list actions",
		"description": "Remove Write a message and other action buttons when a folder or search is empty"
	},
	{
		"id": "/settings/inbox-compact-empty-list-state",
		"href": "/settings/inbox",
		"title": "Compact empty list state",
		"description": "Less padding and smaller icons when a folder or search has no messages"
	},
	{
		"id": "/settings/inbox-compact-list-error-state",
		"href": "/settings/inbox",
		"title": "Compact list error state",
		"description": "Less padding when the message list fails to load"
	},
	{
		"id": "/settings/inbox-hide-list-error-retry",
		"href": "/settings/inbox",
		"title": "Hide list error retry",
		"description": "Remove the Try again button when the message list fails to load"
	},
	{
		"id": "/settings/reading-reading-size",
		"href": "/settings/reading",
		"title": "Reading size",
		"description": "Text size when reading and writing — HTML mail follows the reader theme in dark mode"
	},
	{
		"id": "/settings/reading-block-external-content",
		"href": "/settings/reading",
		"title": "Block external content",
		"description": "Block remote images in HTML mail — you can still show them once per message"
	},
	{
		"id": "/settings/reading-hide-blocked-images-banner",
		"href": "/settings/reading",
		"title": "Hide blocked-images banner",
		"description": "Do not show the external images notice in the reader"
	},
	{
		"id": "/settings/reading-compact-blocked-images-banner",
		"href": "/settings/reading",
		"title": "Compact blocked-images banner",
		"description": "Smaller external images notice in the reading pane"
	},
	{
		"id": "/settings/reading-prefer-plain-text",
		"href": "/settings/reading",
		"title": "Prefer plain text",
		"description": "Show the plain-text version when available instead of formatted HTML"
	},
	{
		"id": "/settings/reading-compact-reader-body",
		"href": "/settings/reading",
		"title": "Compact reader body",
		"description": "Less padding around message content in the reading pane"
	},
	{
		"id": "/settings/reading-hide-reader-pane-borders",
		"href": "/settings/reading",
		"title": "Hide reader pane borders",
		"description": "Remove divider lines in the reading pane header, banners, and between thread messages"
	},
	{
		"id": "/settings/reading-show-quick-reply",
		"href": "/settings/reading",
		"title": "Show quick reply",
		"description": "Reply box at the bottom of an open message — use Full reply for the compose panel"
	},
	{
		"id": "/settings/reading-compact-quick-reply",
		"href": "/settings/reading",
		"title": "Compact quick reply",
		"description": "Single-line reply box with less padding at the bottom of the reading pane"
	},
	{
		"id": "/settings/reading-show-contact-actions",
		"href": "/settings/reading",
		"title": "Show contact actions",
		"description": "Save contact and copy email links in the message header"
	},
	{
		"id": "/settings/reading-hide-to-and-cc-lines",
		"href": "/settings/reading",
		"title": "Hide To and Cc lines",
		"description": "Do not show recipient lists under the sender in the message header"
	},
	{
		"id": "/settings/reading-hide-sender-email",
		"href": "/settings/reading",
		"title": "Hide sender email",
		"description": "Show only the sender name in the message header — no email address line"
	},
	{
		"id": "/settings/reading-minimal-reader-toolbar",
		"href": "/settings/reading",
		"title": "Minimal reader toolbar",
		"description": "Hide star, reply all, and forward buttons — reply and more actions stay available"
	},
	{
		"id": "/settings/reading-compact-reader-toolbar",
		"href": "/settings/reading",
		"title": "Compact reader toolbar",
		"description": "Tighter spacing between action buttons in the reading pane header"
	},
	{
		"id": "/settings/reading-compact-reader-more-menu",
		"href": "/settings/reading",
		"title": "Compact reader more menu",
		"description": "Tighter spacing in the mobile more-actions menu in the reading pane"
	},
	{
		"id": "/settings/reading-compact-reader-avatars",
		"href": "/settings/reading",
		"title": "Compact reader avatars",
		"description": "Smaller sender avatars in the reading pane"
	},
	{
		"id": "/settings/reading-compact-reader-header",
		"href": "/settings/reading",
		"title": "Compact reader header",
		"description": "Smaller subject line and less padding at the top of the reading pane"
	},
	{
		"id": "/settings/reading-expand-all-thread-messages",
		"href": "/settings/reading",
		"title": "Expand all thread messages",
		"description": "Show every message in a conversation expanded by default"
	},
	{
		"id": "/settings/reading-hide-thread-summary",
		"href": "/settings/reading",
		"title": "Hide thread summary",
		"description": "Do not show message count and expand/collapse controls under the subject"
	},
	{
		"id": "/settings/reading-hide-thread-collapse-buttons",
		"href": "/settings/reading",
		"title": "Hide thread collapse buttons",
		"description": "Remove expand/collapse chevrons on individual messages in a thread"
	},
	{
		"id": "/settings/reading-hide-reader-timestamps",
		"href": "/settings/reading",
		"title": "Hide reader timestamps",
		"description": "Do not show received date and time on messages in the reading pane"
	},
	{
		"id": "/settings/reading-hide-collapsed-thread-previews",
		"href": "/settings/reading",
		"title": "Hide collapsed thread previews",
		"description": "Show only sender names on collapsed messages in a thread — no preview snippet"
	},
	{
		"id": "/settings/reading-compact-collapsed-threads",
		"href": "/settings/reading",
		"title": "Compact collapsed threads",
		"description": "Tighter spacing on collapsed messages in a conversation"
	},
	{
		"id": "/settings/reading-hide-empty-reader-prompts",
		"href": "/settings/reading",
		"title": "Hide empty reader prompts",
		"description": "Leave the reading pane blank until a message is selected — no compose or settings nudges"
	},
	{
		"id": "/settings/reading-hide-empty-reader-description",
		"href": "/settings/reading",
		"title": "Hide empty reader description",
		"description": "Keep the empty reading pane title but remove the explanatory paragraph below it"
	},
	{
		"id": "/settings/reading-hide-empty-reader-actions",
		"href": "/settings/reading",
		"title": "Hide empty reader actions",
		"description": "Remove Compose and settings buttons when no message is selected"
	},
	{
		"id": "/settings/reading-hide-empty-reader-icon",
		"href": "/settings/reading",
		"title": "Hide empty reader icon",
		"description": "Remove the mail icon above the empty reading pane title"
	},
	{
		"id": "/settings/reading-compact-empty-reader",
		"href": "/settings/reading",
		"title": "Compact empty reader",
		"description": "Less padding and smaller text in the reading pane when no message is selected"
	},
	{
		"id": "/settings/reading-compact-reader-status",
		"href": "/settings/reading",
		"title": "Compact reader status",
		"description": "Less padding on offline, not-found, and load-error screens in the reading pane"
	},
	{
		"id": "/settings/reading-compact-reader-inline-error",
		"href": "/settings/reading",
		"title": "Compact reader inline error",
		"description": "Smaller load-error banner above the message body when a thread fails to open"
	},
	{
		"id": "/settings/reading-hide-reader-status-back-button",
		"href": "/settings/reading",
		"title": "Hide reader status back button",
		"description": "Remove the Back to list button on offline, not-found, and load-error screens"
	},
	{
		"id": "/settings/reading-hide-reader-status-message",
		"href": "/settings/reading",
		"title": "Hide reader status message",
		"description": "Show only the status heading on offline, not-found, and load-error screens — no detail text"
	},
	{
		"id": "/settings/compose-compose-layout",
		"href": "/settings/compose",
		"title": "Compose layout",
		"description": "Drawer slides over mail on desktop — pane keeps the folder sidebar visible while you write"
	},
	{
		"id": "/settings/compose-hide-compose-hints",
		"href": "/settings/compose",
		"title": "Hide compose hints",
		"description": "Remove nudges like “Set display name”, “Add a signature”, and keyboard shortcut tips"
	},
	{
		"id": "/settings/compose-collapse-quoted-text",
		"href": "/settings/compose",
		"title": "Collapse quoted text",
		"description": "Keep quoted reply content folded when composing"
	},
	{
		"id": "/settings/compose-show-cc-bcc-fields",
		"href": "/settings/compose",
		"title": "Show Cc/Bcc fields",
		"description": "Cc and Bcc rows in compose — reply-all still shows Cc when needed"
	},
	{
		"id": "/settings/compose-hide-from-line-in-compose",
		"href": "/settings/compose",
		"title": "Hide From line in compose",
		"description": "Remove the sender row at the top of the compose panel"
	},
	{
		"id": "/settings/compose-hide-compose-field-labels",
		"href": "/settings/compose",
		"title": "Hide compose field labels",
		"description": "Remove To, Cc, Bcc, and Subject labels — fields stay usable with placeholders"
	},
	{
		"id": "/settings/compose-compact-compose-panel",
		"href": "/settings/compose",
		"title": "Compact compose panel",
		"description": "Narrower compose drawer on desktop — more room beside the message list"
	},
	{
		"id": "/settings/compose-icon-only-attach-button",
		"href": "/settings/compose",
		"title": "Icon-only attach button",
		"description": "Show only the paperclip icon for attachments in compose — no “Attach” label"
	},
	{
		"id": "/settings/compose-icon-only-discard-button",
		"href": "/settings/compose",
		"title": "Icon-only discard button",
		"description": "Show an X icon instead of the Discard label in compose"
	},
	{
		"id": "/settings/compose-hide-compose-panel-borders",
		"href": "/settings/compose",
		"title": "Hide compose panel borders",
		"description": "Remove divider lines between header, fields, and footer in compose"
	},
	{
		"id": "/settings/compose-compact-compose-attachments",
		"href": "/settings/compose",
		"title": "Compact compose attachments",
		"description": "Tighter spacing and smaller chips for files attached in compose"
	},
	{
		"id": "/settings/compose-compact-attachments",
		"href": "/settings/compose",
		"title": "Compact attachments",
		"description": "Smaller attachment chips without the count label or file sizes — in reader and compose"
	},
	{
		"id": "/settings/compose-compose-contact-suggestions",
		"href": "/settings/compose",
		"title": "Compose contact suggestions",
		"description": "Autocomplete contacts while typing recipients"
	},
	{
		"id": "/settings/compose-compact-compose-suggestions",
		"href": "/settings/compose",
		"title": "Compact compose suggestions",
		"description": "Tighter spacing in recipient autocomplete while composing"
	},
	{
		"id": "/settings/workspace-compact-layout",
		"href": "/settings/workspace",
		"title": "Compact layout",
		"description": "Narrower folder sidebar and message list on desktop — separate from list density in Inbox"
	},
	{
		"id": "/settings/workspace-hide-folder-sidebar-header",
		"href": "/settings/workspace",
		"title": "Hide folder sidebar header",
		"description": "Remove the “Folders” label above the mailbox tree"
	},
	{
		"id": "/settings/workspace-compact-folder-sidebar-header",
		"href": "/settings/workspace",
		"title": "Compact folder sidebar header",
		"description": "Less padding around the Folders label in the sidebar"
	},
	{
		"id": "/settings/workspace-hide-folder-icons",
		"href": "/settings/workspace",
		"title": "Hide folder icons",
		"description": "Text-only folder names in the sidebar"
	},
	{
		"id": "/settings/workspace-compact-folder-sidebar",
		"href": "/settings/workspace",
		"title": "Compact folder sidebar",
		"description": "Tighter spacing on folder rows and sidebar padding"
	},
	{
		"id": "/settings/workspace-compact-folder-tree",
		"href": "/settings/workspace",
		"title": "Compact folder tree",
		"description": "Less indentation and spacing for nested folders in the sidebar"
	},
	{
		"id": "/settings/workspace-hide-list-header-on-desktop",
		"href": "/settings/workspace",
		"title": "Hide list header on desktop",
		"description": "Remove the folder title bar above messages — mobile folder picker stays"
	},
	{
		"id": "/settings/workspace-compact-list-header",
		"href": "/settings/workspace",
		"title": "Compact list header",
		"description": "Shorter folder title bar above the message list"
	},
	{
		"id": "/settings/workspace-compact-mobile-folder-picker",
		"href": "/settings/workspace",
		"title": "Compact mobile folder picker",
		"description": "Smaller folder dropdown above the message list on mobile"
	},
	{
		"id": "/settings/workspace-compact-header-actions",
		"href": "/settings/workspace",
		"title": "Compact header actions",
		"description": "Icon-only New and New event buttons in the top bar — saves horizontal space"
	},
	{
		"id": "/settings/workspace-compact-app-header",
		"href": "/settings/workspace",
		"title": "Compact app header",
		"description": "Shorter top bar with less horizontal padding and spacing"
	},
	{
		"id": "/settings/workspace-hide-pane-borders",
		"href": "/settings/workspace",
		"title": "Hide pane borders",
		"description": "Remove divider lines between the header, folder sidebar, and message list"
	},
	{
		"id": "/settings/workspace-hide-app-title",
		"href": "/settings/workspace",
		"title": "Hide app title",
		"description": "Remove the ZAUR label from the top bar — the logo link still works for screen readers"
	},
	{
		"id": "/settings/workspace-compact-account-menu",
		"href": "/settings/workspace",
		"title": "Compact account menu",
		"description": "Show only your avatar in the account button — no dropdown chevron"
	},
	{
		"id": "/settings/workspace-compact-account-menu-dropdown",
		"href": "/settings/workspace",
		"title": "Compact account menu dropdown",
		"description": "Tighter spacing in the account menu panel — name, settings, theme, and sign out"
	},
	{
		"id": "/settings/workspace-expand-list-until-opened",
		"href": "/settings/workspace",
		"title": "Expand list until opened",
		"description": "Use the full width for the message list on desktop until you pick a message"
	},
	{
		"id": "/settings/workspace-compact-folder-sidebar-error",
		"href": "/settings/workspace",
		"title": "Compact folder sidebar error",
		"description": "Smaller folder load error message and retry button in the sidebar"
	},
	{
		"id": "/settings/workspace-skip-home-screen",
		"href": "/settings/workspace",
		"title": "Skip home screen",
		"description": "Open inbox directly — hides the Home tab and welcome screen"
	},
	{
		"id": "/settings/workspace-compact-home-screen",
		"href": "/settings/workspace",
		"title": "Compact home screen",
		"description": "Tighter welcome screen with smaller tool cards"
	},
	{
		"id": "/settings/workspace-hide-home-screen-subtitle",
		"href": "/settings/workspace",
		"title": "Hide home screen subtitle",
		"description": "Remove the “Choose a tool to get started” line under Welcome back"
	},
	{
		"id": "/settings/workspace-hide-home-card-descriptions",
		"href": "/settings/workspace",
		"title": "Hide home card descriptions",
		"description": "Show only tool names on the welcome screen cards — no subtitle under each"
	},
	{
		"id": "/settings/workspace-hide-open-inbox-button",
		"href": "/settings/workspace",
		"title": "Hide open inbox button",
		"description": "Remove the Open inbox button at the bottom of the home screen"
	},
	{
		"id": "/settings/workspace-remember-last-mailbox",
		"href": "/settings/workspace",
		"title": "Remember last mailbox",
		"description": "Open your last visited folder instead of Inbox when signing in or clicking Mail"
	},
	{
		"id": "/settings/workspace-hide-sidebar-shortcuts",
		"href": "/settings/workspace",
		"title": "Hide sidebar shortcuts",
		"description": "Remove Contacts and Settings links from the mail folder sidebar — they stay in the top bar"
	},
	{
		"id": "/settings/workspace-compact-sidebar-shortcuts",
		"href": "/settings/workspace",
		"title": "Compact sidebar shortcuts",
		"description": "Tighter Contacts and Settings links at the bottom of the folder sidebar"
	},
	{
		"id": "/settings/workspace-mail-only-navigation",
		"href": "/settings/workspace",
		"title": "Mail-only navigation",
		"description": "Hide Calendar and Contacts from the top bar — for a focused mail experience"
	},
	{
		"id": "/settings/workspace-hide-header-search",
		"href": "/settings/workspace",
		"title": "Hide header search",
		"description": "Remove the search bar from the top bar — search remains on mobile via the icon"
	},
	{
		"id": "/settings/workspace-search-contact-suggestions",
		"href": "/settings/workspace",
		"title": "Search contact suggestions",
		"description": "Contact matches while typing in the header search bar"
	},
	{
		"id": "/settings/workspace-hide-search-dropdown-headers",
		"href": "/settings/workspace",
		"title": "Hide search dropdown headers",
		"description": "Remove section labels like “Contacts” in the header search suggestions"
	},
	{
		"id": "/settings/workspace-compact-search-dropdown",
		"href": "/settings/workspace",
		"title": "Compact search dropdown",
		"description": "Tighter spacing in header search suggestion results"
	},
	{
		"id": "/settings/workspace-show-folder-unread-counts",
		"href": "/settings/workspace",
		"title": "Show folder unread counts",
		"description": "Unread badges on folders in the sidebar and mobile folder picker"
	},
	{
		"id": "/settings/workspace-compact-folder-badges",
		"href": "/settings/workspace",
		"title": "Compact folder badges",
		"description": "Smaller unread count badges on folders in the sidebar"
	},
	{
		"id": "/settings/workspace-tool-icons-only",
		"href": "/settings/workspace",
		"title": "Tool icons only",
		"description": "Hide Mail, Calendar, and other tool names in the top bar — icons with tooltips only"
	},
	{
		"id": "/settings/workspace-compact-tool-switcher",
		"href": "/settings/workspace",
		"title": "Compact tool switcher",
		"description": "Tighter padding on Mail, Calendar, and Home tabs in the top bar"
	},
	{
		"id": "/settings/workspace-hide-offline-indicator",
		"href": "/settings/workspace",
		"title": "Hide offline indicator",
		"description": "Do not show the offline badge in the header when you lose connection"
	},
	{
		"id": "/settings/workspace-compact-offline-indicator",
		"href": "/settings/workspace",
		"title": "Compact offline indicator",
		"description": "Smaller offline badge in the header"
	},
	{
		"id": "/settings/workspace-hide-outbox-unless-failed",
		"href": "/settings/workspace",
		"title": "Hide outbox unless failed",
		"description": "Do not show the outbox icon while messages are sending — only when a send fails"
	},
	{
		"id": "/settings/workspace-compact-outbox-menu",
		"href": "/settings/workspace",
		"title": "Compact outbox menu",
		"description": "Tighter spacing in the queued-messages dropdown from the header"
	},
	{
		"id": "/settings/workspace-compact-mobile-search",
		"href": "/settings/workspace",
		"title": "Compact mobile search",
		"description": "Less padding on the search field bar on mobile"
	},
	{
		"id": "/settings/calendar-compact-calendar-grid",
		"href": "/settings/calendar",
		"title": "Compact calendar grid",
		"description": "Smaller day cells with tighter spacing in the month grid"
	},
	{
		"id": "/settings/calendar-compact-calendar-header",
		"href": "/settings/calendar",
		"title": "Compact calendar header",
		"description": "Shorter month navigation bar above the grid"
	},
	{
		"id": "/settings/calendar-week-starts-on-monday",
		"href": "/settings/calendar",
		"title": "Week starts on Monday",
		"description": "Use Monday as the first column in the month grid"
	},
	{
		"id": "/settings/calendar-events-shown-per-day",
		"href": "/settings/calendar",
		"title": "Events shown per day",
		"description": "How many event chips appear before a “more” label"
	},
	{
		"id": "/settings/calendar-hide-event-times-in-grid",
		"href": "/settings/calendar",
		"title": "Hide event times in grid",
		"description": "Show only event titles on day cells — no start times"
	},
	{
		"id": "/settings/calendar-hide-more-events-label",
		"href": "/settings/calendar",
		"title": "Hide more-events label",
		"description": "Do not show “+N more” when a day has additional events"
	},
	{
		"id": "/settings/calendar-compact-calendar-sidebar",
		"href": "/settings/calendar",
		"title": "Compact calendar sidebar",
		"description": "Tighter spacing on calendar checkboxes in the sidebar"
	},
	{
		"id": "/settings/calendar-hide-calendar-sidebar-header",
		"href": "/settings/calendar",
		"title": "Hide calendar sidebar header",
		"description": "Remove the Calendars label above the calendar list"
	},
	{
		"id": "/settings/calendar-hide-calendar-settings-link",
		"href": "/settings/calendar",
		"title": "Hide calendar settings link",
		"description": "Remove the Settings shortcut at the bottom of the calendar sidebar"
	},
	{
		"id": "/settings/calendar-hide-new-event-button",
		"href": "/settings/calendar",
		"title": "Hide new event button",
		"description": "Remove the New event button from the month header"
	},
	{
		"id": "/settings/calendar-icon-only-new-event-button",
		"href": "/settings/calendar",
		"title": "Icon-only new event button",
		"description": "Show only the plus icon on desktop — no New event label"
	},
	{
		"id": "/settings/calendar-compact-event-panel",
		"href": "/settings/calendar",
		"title": "Compact event panel",
		"description": "Less padding in the event details panel"
	},
	{
		"id": "/settings/calendar-hide-empty-event-panel",
		"href": "/settings/calendar",
		"title": "Hide empty event panel",
		"description": "Leave the right pane blank until an event is selected — no placeholder message"
	},
	{
		"id": "/settings/calendar-compact-empty-event-panel",
		"href": "/settings/calendar",
		"title": "Compact empty event panel",
		"description": "Less padding and a smaller icon when no event is selected"
	},
	{
		"id": "/settings/calendar-compact-event-compose",
		"href": "/settings/calendar",
		"title": "Compact event compose",
		"description": "Less padding in the new and edit event panel"
	},
	{
		"id": "/settings/calendar-hide-compose-field-labels",
		"href": "/settings/calendar",
		"title": "Hide compose field labels",
		"description": "Remove field labels in the event form — placeholders stay"
	},
	{
		"id": "/settings/calendar-hide-calendar-pane-borders",
		"href": "/settings/calendar",
		"title": "Hide calendar pane borders",
		"description": "Remove divider lines between the sidebar, month grid, and event panel"
	},
	{
		"id": "/settings/contacts-compact-contacts-page",
		"href": "/settings/contacts",
		"title": "Compact contacts page",
		"description": "Less padding and a smaller header on the Contacts page"
	},
	{
		"id": "/settings/contacts-compact-contacts-list",
		"href": "/settings/contacts",
		"title": "Compact contacts list",
		"description": "Tighter rows in the contacts list — avatars follow the show avatars setting"
	},
	{
		"id": "/settings/contacts-compact-contacts-search",
		"href": "/settings/contacts",
		"title": "Compact contacts search",
		"description": "Smaller search field on the Contacts page"
	},
	{
		"id": "/settings/contacts-compact-contacts-add-form",
		"href": "/settings/contacts",
		"title": "Compact contacts add form",
		"description": "Less padding and smaller labels on the add-contact form"
	},
	{
		"id": "/settings/contacts-hide-contact-message-counts",
		"href": "/settings/contacts",
		"title": "Hide contact message counts",
		"description": "Do not show how many messages you've exchanged with each contact"
	},
	{
		"id": "/settings/contacts-hide-contact-group-letters",
		"href": "/settings/contacts",
		"title": "Hide contact group letters",
		"description": "Remove A–Z section headings in the contacts list"
	},
	{
		"id": "/settings/contacts-hide-contacts-email-line",
		"href": "/settings/contacts",
		"title": "Hide contacts email line",
		"description": "Show only contact names in the list — no email address under each name"
	},
	{
		"id": "/settings/contacts-hide-contacts-page-subtitle",
		"href": "/settings/contacts",
		"title": "Hide contacts page subtitle",
		"description": "Remove the description under the Contacts heading"
	},
	{
		"id": "/settings/contacts-hide-contacts-settings-button",
		"href": "/settings/contacts",
		"title": "Hide contacts settings button",
		"description": "Remove the Settings shortcut from the Contacts page header"
	},
	{
		"id": "/settings/contacts-hide-contacts-new-message-button",
		"href": "/settings/contacts",
		"title": "Hide contacts new message button",
		"description": "Remove the New message button from the Contacts page header"
	},
	{
		"id": "/settings/contacts-hide-contacts-hover-actions",
		"href": "/settings/contacts",
		"title": "Hide contacts hover actions",
		"description": "Remove copy and remove buttons that appear when hovering a contact row"
	},
	{
		"id": "/settings/contacts-hide-contacts-row-mail-icon",
		"href": "/settings/contacts",
		"title": "Hide contacts row mail icon",
		"description": "Remove the mail icon on the right side of each contact row"
	},
	{
		"id": "/settings/contacts-compact-contacts-empty-state",
		"href": "/settings/contacts",
		"title": "Compact contacts empty state",
		"description": "Less padding and smaller icon when the contacts list is empty"
	},
	{
		"id": "/settings/contacts-hide-contacts-empty-hints",
		"href": "/settings/contacts",
		"title": "Hide contacts empty hints",
		"description": "Remove the secondary help text when the contacts list is empty or has no search matches"
	},
	{
		"id": "/settings/contacts-hide-contacts-empty-actions",
		"href": "/settings/contacts",
		"title": "Hide contacts empty actions",
		"description": "Remove Add contact and Go to inbox buttons when the contacts list is empty"
	},
	{
		"id": "/settings/appearance-hide-settings-nav-hints",
		"href": "/settings/appearance",
		"title": "Hide settings nav hints",
		"description": "Remove section hints under each settings link in the sidebar — and the sync note at the bottom"
	},
	{
		"id": "/settings/appearance-hide-settings-panel-descriptions",
		"href": "/settings/appearance",
		"title": "Hide settings panel descriptions",
		"description": "Remove the intro paragraph under each settings page heading"
	},
	{
		"id": "/settings/appearance-compact-settings-rows",
		"href": "/settings/appearance",
		"title": "Compact settings rows",
		"description": "Less padding on each option row and between groups on settings pages"
	},
	{
		"id": "/settings/appearance-compact-settings-layout",
		"href": "/settings/appearance",
		"title": "Compact settings layout",
		"description": "Reduce outer padding and column gap on settings pages"
	},
	{
		"id": "/settings/appearance-compact-settings-panel",
		"href": "/settings/appearance",
		"title": "Compact settings panel",
		"description": "Less padding inside each settings card"
	},
	{
		"id": "/settings/appearance-compact-settings-nav",
		"href": "/settings/appearance",
		"title": "Compact settings nav",
		"description": "Tighter sidebar and mobile tab links on settings pages"
	},
	{
		"id": "/settings/appearance-hide-settings-back-link",
		"href": "/settings/appearance",
		"title": "Hide settings back link",
		"description": "Remove the Back to mail link above settings navigation"
	},
	{
		"id": "/settings/appearance-hide-settings-page-title",
		"href": "/settings/appearance",
		"title": "Hide settings page title",
		"description": "Remove the Settings heading above the sidebar and mobile tabs"
	},
	{
		"id": "/settings/data-apply-simple-mode",
		"href": "/settings/data",
		"title": "Apply simple mode",
		"description": "One step to a minimal mail-only layout — you can still tweak individual options afterward"
	},
	{
		"id": "/settings/data-reset-all-display-layout-settings",
		"href": "/settings/data",
		"title": "Reset all display & layout settings",
		"description": "Reset every display, layout, and navigation option across the app — not mail behavior like notifications"
	},
	{
		"id": "/settings/data-export-settings",
		"href": "/settings/data",
		"title": "Export settings",
		"description": "Download a JSON backup of your preferences (also synced to your mail account)"
	},
	{
		"id": "/settings/data-import-settings",
		"href": "/settings/data",
		"title": "Import settings",
		"description": "Restore preferences from a previously exported JSON file"
	},
	{
		"id": "/settings/mail-notify-on-new-mail",
		"href": "/settings/mail",
		"title": "Notify on new mail",
		"description": "Toast and browser notification when new mail arrives in Inbox"
	},
	{
		"id": "/settings/mail-show-unread-count-in-tab-title",
		"href": "/settings/mail",
		"title": "Show unread count in tab title",
		"description": "Prefix the browser tab with the number of unread Inbox messages"
	},
	{
		"id": "/settings/mail-mark-as-read-when-opened",
		"href": "/settings/mail",
		"title": "Mark as read when opened",
		"description": "Automatically mark conversations read when you open them"
	},
	{
		"id": "/settings/mail-keyboard-shortcuts",
		"href": "/settings/mail",
		"title": "Keyboard shortcuts",
		"description": "Press c to compose and / to focus search while in mail"
	},
	{
		"id": "/settings/mail-confirm-before-delete",
		"href": "/settings/mail",
		"title": "Confirm before delete",
		"description": "Ask before moving messages to trash — permanent delete in Trash always asks"
	},
	{
		"id": "/settings/mail-confirm-before-discarding-compose",
		"href": "/settings/mail",
		"title": "Confirm before discarding compose",
		"description": "Ask when closing compose with unsent content"
	},
	{
		"id": "/settings/mail-return-to-inbox-after-sending",
		"href": "/settings/mail",
		"title": "Return to inbox after sending",
		"description": "Go back to Inbox instead of Sent after a message is delivered"
	},
	{
		"id": "/settings/mail-auto-load-more-messages",
		"href": "/settings/mail",
		"title": "Auto-load more messages",
		"description": "Load older messages automatically when you scroll to the bottom of the list"
	},
	{
		"id": "/settings/mail-compact-load-more",
		"href": "/settings/mail",
		"title": "Compact load more",
		"description": "Tighter spacing for the load-more area at the bottom of the message list"
	},
	{
		"id": "/settings/mail-hide-keyboard-shortcuts-help",
		"href": "/settings/mail",
		"title": "Hide keyboard shortcuts help",
		"description": "Remove the shortcut reference section at the bottom of Mail settings"
	},
	{
		"id": "/settings/mail-hide-action-toasts",
		"href": "/settings/mail",
		"title": "Hide action toasts",
		"description": "Suppress success and info notifications — errors still appear"
	},
	{
		"id": "/settings/mail-compact-toasts",
		"href": "/settings/mail",
		"title": "Compact toasts",
		"description": "Smaller notification popups in the bottom-right corner"
	},
	{
		"id": "/settings/mail-hide-toast-icons",
		"href": "/settings/mail",
		"title": "Hide toast icons",
		"description": "Text-only notification popups — no success, error, or info icons"
	},
	{
		"id": "/settings/mail-restore-mail-defaults",
		"href": "/settings/mail",
		"title": "Restore mail defaults",
		"description": "Reset notifications, shortcuts, and confirmation options on this page"
	},
	{
		"id": "/settings/mail-compose",
		"href": "/settings/mail",
		"title": "Compose",
		"description": "Start a new message from the mail view"
	},
	{
		"id": "/settings/mail-search",
		"href": "/settings/mail",
		"title": "Search",
		"description": "Focus the search field from anywhere in mail"
	},
	{
		"id": "/settings/mail-next-message",
		"href": "/settings/mail",
		"title": "Next message",
		"description": "Move to the next message in the list"
	},
	{
		"id": "/settings/mail-previous-message",
		"href": "/settings/mail",
		"title": "Previous message",
		"description": "Move to the previous message in the list"
	},
	{
		"id": "/settings/mail-reply",
		"href": "/settings/mail",
		"title": "Reply",
		"description": "Reply to the open message"
	},
	{
		"id": "/settings/mail-reply-all",
		"href": "/settings/mail",
		"title": "Reply all",
		"description": "Reply all on the open thread"
	},
	{
		"id": "/settings/mail-archive",
		"href": "/settings/mail",
		"title": "Archive",
		"description": "Archive the open message"
	},
	{
		"id": "/settings/mail-mark-unread",
		"href": "/settings/mail",
		"title": "Mark unread",
		"description": "Toggle read/unread on the open message"
	},
	{
		"id": "/settings/mail-delete",
		"href": "/settings/mail",
		"title": "Delete",
		"description": "Move the open message to trash — undo appears in the toast"
	},
	{
		"id": "/settings/mail-send-message",
		"href": "/settings/mail",
		"title": "Send message",
		"description": "While writing in compose or quick reply"
	},
	{
		"id": "/settings/mail-close-compose",
		"href": "/settings/mail",
		"title": "Close compose",
		"description": "Dismiss the compose panel"
	},
	{
		"id": "/settings/account-display-name",
		"href": "/settings/account",
		"title": "Display name",
		"description": "Remove description text under profile fields and local data on this page"
	},
	{
		"id": "/settings/account-export-settings",
		"href": "/settings/account",
		"title": "Export settings",
		"description": "Download a JSON backup of your preferences — also under Backup & reset"
	}
];
