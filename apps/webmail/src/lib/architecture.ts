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
		root: '/settings',
		account: '/settings/account',
		mail: '/settings/mail',
		inbox: '/settings/inbox',
		reading: '/settings/reading',
		compose: '/settings/compose',
		appearance: '/settings/appearance',
		layout: '/settings/layout',
		calendar: '/settings/calendar',
		data: '/settings/data',
		/** Legacy — redirect */
		workspace: '/settings/workspace',
		display: '/settings/display',
		sidebar: '/settings/sidebar',
		contacts: '/settings/contacts'
	},
	calendar: '/calendar',
	contacts: '/contacts'
} as const;

export const componentTree = {
	shell: {
		AppShellHeader: [
			'ToolSwitcher',
			'MailShellHeaderContext',
			'GlobalSearch',
			'OfflineIndicator',
			'OutboxMenu',
			'NewButton',
			'UserMenu'
		],
		AppSidebar: 'settings navigation when in /settings'
	},
	calendar: {
		CalendarLayout: ['CalendarSidebar', 'MonthView', 'EventPanel | EventPanelEmpty', 'EventComposePanel']
	},
	contacts: {
		ContactsLayout: ['ContactsSidebar', 'ContactsList', 'ContactDetailPanel | ContactDetailEmpty']
	},
	mail: {
		MailLayout: ['MailboxSidebar', 'MailPane'],
		MailPane: ['MessageList', 'MessageReader | MessageReaderEmpty'],
		MailboxSidebar: ['MailboxTree', 'MailboxItem'],
		MessageList: ['MessageListItem'],
		MessageReader: ['ReaderTitle', 'ReaderBody'],
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
