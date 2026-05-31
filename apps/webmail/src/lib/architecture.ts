/** Route map and component tree — living reference for ZAUR webmail. */

export const routeMap = {
	root: '/mail/inbox',
	login: '/login',
	mail: {
		inbox: '/mail/inbox',
		mailbox: '/mail/[mailbox]',
		thread: '/mail/[mailbox]/[threadId]',
		compose: '/mail/compose',
		search: '/mail/search'
	},
	settings: {
		root: '/settings/account',
		account: '/settings/account',
		reading: '/settings/reading',
		writing: '/settings/writing',
		layout: '/settings/layout',
		appearance: '/settings/appearance',
		data: '/settings/data',
		/** Legacy — redirect */
		mail: '/settings/mail',
		workspace: '/settings/workspace',
		calendar: '/settings/calendar',
		inbox: '/settings/inbox',
		compose: '/settings/compose',
		display: '/settings/display',
		sidebar: '/settings/sidebar',
		contacts: '/settings/contacts'
	},
	calendar: '/calendar',
	contacts: '/contacts'
} as const;

/**
 * Webmail layout — editorial Simple mode (single product shell).
 *
 * Source of truth: `src/lib/modes/registry.ts`
 */
export const modeArchitecture = {
	registry: 'src/lib/modes/registry.ts',
	context: 'src/lib/modes/context.ts',
	mailLayout: 'src/lib/modes/simple/SimpleMailLayout.svelte',
	readingSettings: 'src/lib/modes/simple/settings/reading.svelte',
	settingsLayout: 'src/lib/modes/simple/SimpleSettingsLayout.svelte',
	contentShell: 'src/lib/modes/simple/simple-content-layout.ts',
	compose: 'src/lib/modes/simple/SimpleComposePanel.svelte'
} as const;

export const componentTree = {
	shell: {
		AppShellHeader: [
			'GlobalSearch',
			'OfflineIndicator',
			'UserMenu'
		]
	},
	calendar: {
		CalendarLayout: ['CalendarSidebar', 'MonthView', 'EventPanel | EventPanelEmpty', 'EventComposePanel']
	},
	contacts: {
		ContactsLayout: ['ContactsSidebar', 'ContactsList', 'ContactDetailPanel | ContactDetailEmpty']
	},
	mail: {
		MailLayout: ['MailPane → SimpleMailSurface'],
		SimpleMailLayout: ['SimpleMessageList (sectioned)', 'SimpleMessageReader | MessageReaderEmpty'],
		SimpleMessageReader: ['MessageReaderCore', 'minimalChrome'],
		SimpleMessageList: ['sectioned inbox', 'text nav', 'editorial rows', 'bulk select'],
		MessageList: ['SimpleMessageList'],
		MessageReader: ['SimpleMessageReader'],
		MessageReaderCore: ['thread body', 'quick reply', 'mobile bar'],
		SimpleComposePanel: ['ComposeHeader', 'ComposeFields', 'ComposeEditor']
	},
	ui: ['Button', 'IconButton', 'Badge', 'Avatar', 'ToastStack'],
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
		pushListener: ['EventSource via /api/jmap/events', 'polling fallback'],
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
