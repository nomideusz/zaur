import type { Mailbox, MessageDetail, MessagePreview } from '$lib/types/mail';

export const mockMailboxes: Mailbox[] = [
	{ id: 'inbox', name: 'Inbox', role: 'inbox', unread: 3, total: 128 },
	{ id: 'drafts', name: 'Drafts', role: 'drafts', unread: 0, total: 2 },
	{ id: 'sent', name: 'Sent', role: 'sent', unread: 0, total: 54 },
	{ id: 'archive', name: 'Archive', role: 'archive', unread: 0, total: 31 },
	{ id: 'junk', name: 'Junk', role: 'junk', unread: 1, total: 4 },
	{ id: 'trash', name: 'Trash', role: 'trash', unread: 0, total: 7 },
	{ id: 'projects', name: 'Projects', role: 'custom', unread: 0, total: 12, parentId: 'inbox' }
];

export const mockMessages: MessagePreview[] = [
	{
		id: 'm1',
		threadId: 't1',
		mailboxId: 'inbox',
		from: { name: 'Anna Kowalska', email: 'anna@example.com' },
		subject: 'Q2 planning — quick sync tomorrow?',
		preview: 'Hi Bartek, can we align on the roadmap before Thursday? I put a draft in the shared doc…',
		receivedAt: '2026-05-23T09:14:00Z',
		unread: true,
		starred: false,
		hasAttachment: false
	},
	{
		id: 'm2',
		threadId: 't2',
		mailboxId: 'inbox',
		from: { name: 'Stalwart Notifications', email: 'noreply@mail.zaur.app' },
		subject: 'New sign-in from Firefox on Linux',
		preview: 'We noticed a new login to your account. If this was you, no action is needed.',
		receivedAt: '2026-05-22T18:02:00Z',
		unread: true,
		starred: false,
		hasAttachment: false
	},
	{
		id: 'm3',
		threadId: 't3',
		mailboxId: 'inbox',
		from: { name: 'Design Collective', email: 'hello@design.io' },
		subject: 'Invoice #1042 — May retainer',
		preview: 'Please find attached the invoice for May. Payment terms net-14 as usual.',
		receivedAt: '2026-05-22T11:30:00Z',
		unread: false,
		starred: true,
		hasAttachment: true
	},
	{
		id: 'm4',
		threadId: 't4',
		mailboxId: 'inbox',
		from: { name: 'Marcin Nowak', email: 'marcin@zaur.app' },
		subject: 'Webmail UI direction',
		preview: 'Mailfence-style calm layout feels right — three panes, one blue New button, settings behind avatar.',
		receivedAt: '2026-05-21T16:45:00Z',
		unread: true,
		starred: false,
		hasAttachment: false
	}
];

export const mockMessageDetails: Record<string, MessageDetail> = {
	m1: {
		...mockMessages[0],
		to: [{ name: 'Bartek', email: 'bartek@zaur.app' }],
		bodyText:
			'Hi Bartek,\n\ncan we align on the roadmap before Thursday? I put a draft in the shared doc.\n\nBest,\nAnna'
	},
	m2: {
		...mockMessages[1],
		to: [{ name: 'Bartek', email: 'bartek@zaur.app' }],
		bodyText:
			'We noticed a new login to your account from Firefox on Linux.\n\nIf this was you, no action is needed.'
	},
	m3: {
		...mockMessages[2],
		to: [{ name: 'Bartek', email: 'bartek@zaur.app' }],
		bodyText: 'Please find attached the invoice for May. Payment terms net-14 as usual.\n\nThanks,\nDesign Collective'
	},
	m4: {
		...mockMessages[3],
		to: [{ name: 'Bartek', email: 'bartek@zaur.app' }],
		bodyText:
			'Mailfence-style calm layout feels right — three panes, one blue New button, settings behind avatar.\n\n— Marcin'
	}
};
