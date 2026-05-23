/** Route map and component tree — living reference for ZAUR webmail. */

export const routeMap = {
	root: '/',
	login: '/login',
	home: '/',
	mail: {
		inbox: '/mail/inbox',
		mailbox: '/mail/[mailbox]',
		thread: '/mail/[mailbox]/[threadId]',
		compose: '/mail/compose'
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
		planned: ['SyncEngine', 'PushListener (SSE)']
	},
	db: {
		planned: ['RxDB drafts', 'RxDB outbox', 'RxDB recentThreads', 'RxDB syncState']
	}
} as const;
