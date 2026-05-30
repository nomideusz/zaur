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
		experience: '/settings',
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
 * Webmail modes — two distinct product experiences sharing JMAP/sync only.
 *
 * | Layer            | Simple                          | Classic (stored as `traditional`) |
 * |------------------|---------------------------------|-----------------------------------|
 * | Design reference | Editorial one-column sites      | Utility-first dense layouts       |
 * | Mail chrome      | Text nav, no app header         | App header + folder sidebar       |
 * | List             | Sectioned inbox, expanded width | Fixed-width list column           |
 * | Reader           | Adaptive single-focus           | Always-visible split pane         |
 * | Settings UX        | Editorial flat lists, text nav  | Sidebar + cards + utility chrome  |
 * | Mail CSS         | `.z-mail-view-simple`           | `.z-mail-view-traditional`        |
 *
 * Mode selection lives at `/settings` (Experience). Switching modes persists preference
 * and reloads the app (`settings.switchMailViewModeTo`) — modes are session shells, not
 * hot-swapped reactive toggles. Mail → `/mail/inbox`, Settings → `/settings`.
 *
 * Source of truth: `src/lib/modes/registry.ts`
 */
export const modeArchitecture = {
	registry: 'src/lib/modes/registry.ts',
	context: 'src/lib/modes/context.ts',
	switchMode: 'src/lib/mail/switch-mode.ts',
	storageKey: 'zaur:mail-view-mode',
	values: ['simple', 'traditional'] as const,
	uiLabels: { simple: 'Simple', traditional: 'Classic' } as const,
	simple: {
		contentShell: 'src/lib/modes/simple/simple-content-layout.ts',
		mailLayout: 'src/lib/modes/simple/SimpleMailLayout.svelte',
		readingSettings: 'src/lib/modes/simple/settings/reading.svelte',
		settingsLayout: 'src/lib/modes/simple/SimpleSettingsLayout.svelte'
	},
	classic: {
		mailLayout: 'src/lib/modes/classic/ClassicMailLayout.svelte',
		readingSettings: 'src/lib/modes/classic/settings/reading.svelte',
		settingsLayout: 'src/lib/modes/classic/ClassicSettingsLayout.svelte'
	}
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
		MailModeRegistry: ['Simple mode', 'Classic mode'],
		MailLayout: ['MailPane → SimpleMailSurface | ClassicMailSurface'],
		SimpleMailLayout: ['SimpleMessageList (sectioned)', 'SimpleMessageReader | MessageReaderEmpty'],
		ClassicMailLayout: ['MailboxSidebar', 'ClassicMessageList', 'ClassicMessageReader | MessageReaderEmpty'],
		SimpleMessageReader: ['MessageReaderCore', 'minimalChrome'],
		ClassicMessageReader: ['MessageReaderCore', 'full chrome'],
		SimpleMessageList: ['sectioned inbox', 'text nav', 'editorial rows'],
		ClassicMessageList: ['MessageListItem', 'bulk select header'],
		MessageList: ['router → SimpleMessageList | ClassicMessageList'],
		MessageReader: ['router → SimpleMessageReader | ClassicMessageReader'],
		MessageReaderCore: ['thread body', 'quick reply', 'mobile bar'],
		MailboxSidebar: ['MailboxTree', 'MailboxItem'],
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
