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
	future: {
		calendar: '/calendar',
		contacts: '/contacts'
	}
} as const;

export const componentTree = {
	shell: {
		AppHeader: ['ToolSwitcher', 'GlobalSearch', 'NewButton', 'UserMenu'],
		AppSidebar: 'settings navigation when in /settings'
	},
	mail: {
		MailLayout: ['MailboxSidebar', 'MessageList', 'MessageReader | MessageReaderEmpty'],
		MailboxSidebar: ['MailboxTree', 'MailboxItem'],
		MessageList: ['MessageListToolbar', 'MessageListItem'],
		MessageReader: ['ReaderHeader', 'ReaderBody', 'ReaderActions'],
		ComposePanel: ['ComposeHeader', 'ComposeFields', 'ComposeEditor']
	},
	ui: ['Button', 'IconButton', 'Badge', 'Avatar'],
	jmap: {
		client: ['JmapClient.connect', 'getMailboxes', 'getIdentities'],
		proxy: ['POST /api/jmap', 'GET /api/jmap/session', 'httpOnly session cookie'],
		pushListener: ['EventSource via /api/jmap/events', 'polling fallback'],
		planned: ['SyncEngine']
	},
	db: {
		rxdb: ['drafts', 'outbox', 'recentThreads', 'syncState'],
		storage: 'Dexie/IndexedDB per JMAP account',
		planned: ['SyncEngine replication', 'offline send queue processor']
	}
} as const;
