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
		appearance: '/settings/appearance',
		inbox: '/settings/inbox',
		reading: '/settings/reading',
		compose: '/settings/compose',
		workspace: '/settings/workspace',
		mail: '/settings/mail',
		account: '/settings/account',
		contacts: '/settings/contacts',
		calendar: '/settings/calendar',
		data: '/settings/data',
		/** Legacy alias — redirects to appearance */
		display: '/settings/display'
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
		CalendarLayout: ['CalendarSidebar', 'MonthView', 'EventPanel | EventPanelEmpty', 'EventComposePanel']
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
