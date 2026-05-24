/** Route map and component tree — living reference for ZAUR webmail. */

export const routeMap = {
	root: '/',
	login: '/login',
	home: '/',
	mail: {
		inbox: '/mail/inbox',
		mailbox: '/mail/[mailbox]',
		thread: '/mail/[mailbox]/[threadId]',
		compose: '/mail/compose',
		search: '/mail/search'
	},
	settings: {
		root: '/settings',
		display: '/settings/display',
		account: '/settings/account'
	},
	calendar: '/calendar',
	contacts: '/contacts'
} as const;

export const componentTree = {
	shell: {
		AppHeader: ['ToolSwitcher', 'OfflineIndicator', 'GlobalSearch', 'OutboxMenu', 'NewButton', 'UserMenu'],
		AppSidebar: 'settings navigation when in /settings'
	},
	calendar: {
		CalendarLayout: ['CalendarSidebar', 'MonthView', 'EventPanel | EventPanelEmpty']
	},
	mail: {
		MailLayout: ['MailboxSidebar', 'MessageList', 'MessageReader | MessageReaderEmpty'],
		MailboxSidebar: ['MailboxTree', 'MailboxItem'],
		MessageList: ['MessageListToolbar', 'MessageListItem'],
		MessageReader: ['ReaderHeader', 'ReaderBody', 'ReaderActions'],
		ComposePanel: ['ComposeHeader', 'ComposeFields', 'ComposeEditor']
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
			'CalendarEvent/query'
		],
		proxy: ['POST /api/jmap', 'GET /api/jmap/session', 'httpOnly session cookie'],
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
