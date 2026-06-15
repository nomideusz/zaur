/** Route map and component tree — living reference for ZAUR webmail. */

export const routeMap = {
	root: '/',
	login: '/login',
	mail: {
		inbox: '/',
		inboxThread: '/mail/inbox/[threadId]',
		mailbox: '/mail/[mailbox]',
		thread: '/mail/[mailbox]/[threadId]',
		compose: '/mail/compose',
		search: '/mail/search'
	},
	settings: {
		root: '/settings/account',
		account: '/settings/account',
		reading: '/settings/reading',
		writing: '/settings/compose',
		shortcuts: '/settings/shortcuts',
		/** Legacy — redirect to /settings/reading */
		inbox: '/settings/inbox',
		/** Legacy — redirect to /settings/reading */
		mail: '/settings/mail',
		/** Legacy — redirect to /settings/compose */
		compose: '/settings/writing',
		appearance: '/settings/appearance',
		data: '/settings/data',
		/** Legacy — redirect to /settings/account */
		general: '/settings/general',
		/** Legacy — redirect to /settings/reading */
		layout: '/settings/layout',
		/** Legacy — redirect to /settings/reading */
		workspace: '/settings/workspace',
		sidebar: '/settings/sidebar',
		/** Legacy — redirect to /settings/account */
		contacts: '/settings/contacts',
		display: '/settings/display',
		/** Legacy — redirect to /calendar */
		calendar: '/settings/calendar'
	},
	calendar: '/calendar',
	contacts: '/contacts'
} as const;

/**
 * Webmail layout — editorial mail shell (single product layout).
 *
 * Source of truth: `src/lib/mail/config.ts`
 */
export const modeArchitecture = {
	config: 'src/lib/mail/config.ts',
	layout: 'src/lib/mail/layout.ts',
	mailLayout: 'src/lib/components/mail/MailLayout.svelte',
	readingSettings: 'src/lib/settings/sections/reading.svelte',
	composeSettings: 'src/lib/settings/sections/writing.svelte',
	shortcutsSettings: 'src/lib/settings/sections/shortcuts.svelte',
	settingsLayout: 'src/lib/components/settings/SettingsLayout.svelte',
	compose: 'src/lib/components/mail/ComposePanel.svelte'
} as const;

export const componentTree = {
	shell: {
		AppShellHeader: [
			'GlobalSearchCombobox',
			'OfflineIndicator',
			'UserMenu'
		]
	},
	calendar: {
		CalendarLayout: ['CalendarSidebar', 'LibCalendar | AgendaWeekNav', 'EventPanel', 'EventComposePanel']
	},
	contacts: {
		ContactsLayout: ['ContactsSidebar', 'ContactsList', 'ContactDetailPanel | ContactDetailEmpty']
	},
	mail: {
		MailLayout: ['MailPane → MailLayout'],
		MailLayoutBody: ['MessageList (sectioned)', 'MessageReader | MessageReaderEmpty'],
		MessageReader: ['MessageReaderCore'],
		MessageList: ['sectioned inbox', 'text nav', 'editorial rows', 'bulk select'],
		MessageReaderCore: ['thread body', 'mobile bar'],
		ComposePanel: ['ComposeHeader', 'ComposeFields', 'ComposeEditor']
	},
	ui: ['Button', 'IconButton', 'Badge', 'ConfirmDialog', 'TooltipWrap', 'ToastStack'],
	jmap: {
		client: [
			'JmapClient.connect',
			'getMailboxes',
			'getIdentities',
			'Email/changes',
			'Mailbox/changes',
			'Calendar/get',
			'CalendarEvent/query',
			'CalendarEvent/set'
		],
		proxy: ['POST /api/jmap', 'GET /api/jmap/session', 'GET/PUT /api/settings', 'httpOnly session cookie'],
		accountSettings: [
			'WebmailSettings/get+set when server supports https://zaur.app/jmap/webmail-settings/v1',
			'fallback: private archive Email with subject __zaur_webmail_settings_v1__'
		],
		pushListener: ['SSE via GET /api/jmap/events', 'polling fallback'],
		syncEngine: ['incremental Email/Mailbox sync', 'syncState in RxDB']
	},
	db: {
		rxdb: ['drafts', 'outbox', 'recentThreads', 'syncState', 'threadCache', 'attachmentBlobs'],
		storage: 'Dexie/IndexedDB per JMAP account'
	},
	sync: {
		outboxProcessor: ['offline send queue', 'retry on reconnect']
	}
} as const;
