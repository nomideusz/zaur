import { test } from 'node:test';
import assert from 'node:assert/strict';

// Time formatting is locale-stable but TZ-sensitive; pin for deterministic tests.
process.env.TZ = 'UTC';
import {
	attachmentUrl,
	buildRowGroups,
	formatBytes,
	formatListTime,
	formatReaderTime,
	initials,
	previewKind,
	typeBadge,
	type ListRow
} from '../src/lib/mail/rows.ts';
import type { MessagePreview } from '@zaur/mail-core';

let seq = 0;
function preview(overrides: Partial<MessagePreview> = {}): MessagePreview {
	seq += 1;
	return {
		id: `m${seq}`,
		threadId: `t${seq}`,
		mailboxId: 'inbox',
		from: { name: 'Ada Lovelace', email: 'ada@example.com' },
		subject: 'Hello',
		preview: 'World',
		receivedAt: new Date('2026-09-12T10:00:00Z').toISOString(),
		unread: false,
		starred: false,
		important: false,
		hasAttachment: false,
		...overrides
	};
}

test('buildRowGroups: one row per thread, latest message wins, merged flags', () => {
	const now = new Date('2026-09-12T12:00:00Z');
	const rows = buildRowGroups(
		[
			preview({ threadId: 't1', receivedAt: '2026-09-12T09:00:00Z', unread: true }),
			preview({
				threadId: 't1',
				receivedAt: '2026-09-12T11:30:00Z',
				unread: false,
				from: { name: 'Me', email: 'me@zaur.app' }
			}),
			preview({ threadId: 't2', receivedAt: '2026-09-12T10:00:00Z', starred: true })
		],
		'inbox',
		(e) => e === 'me@zaur.app',
		now
	);
	assert.equal(rows.length, 1);
	assert.equal(rows[0]!.label, 'Today');
	assert.equal(rows[0]!.rows.length, 2);
	// Latest first within the group
	assert.equal(rows[0]!.rows[0]!.id, 'm2');
	// Unread merges across the thread even though the latest message was seen
	assert.equal(rows[0]!.rows[0]!.unread, true);
});

test('buildRowGroups: "To …" label when my own message is the latest outside inbox', () => {
	const now = new Date('2026-09-12T12:00:00Z');
	const rows = buildRowGroups(
		[preview({ from: { name: 'Me', email: 'me@zaur.app' }, to: [{ name: 'Bob', email: 'bob@x.io' }] })],
		'sent',
		(e) => e === 'me@zaur.app',
		now
	);
	assert.equal(rows[0]!.rows[0]!.senderLabel, 'To Bob');
});

test('buildRowGroups: date groups in descending order with correct labels', () => {
	const now = new Date('2026-09-12T12:00:00Z');
	const rows = buildRowGroups(
		[
			preview({ receivedAt: '2026-09-10T10:00:00Z' }),
			preview({ receivedAt: '2026-09-11T10:00:00Z' }),
			preview({ receivedAt: '2026-09-12T10:00:00Z' })
		],
		'inbox',
		(e) => e === 'me@zaur.app',
		now
	);
	assert.deepEqual(
		rows.map((g) => g.label),
		['Today', 'Yesterday', '10 September']
	);
});

test('formatListTime: time today, weekday this week, date otherwise', () => {
	const now = new Date('2026-09-12T12:00:00Z');
	// 2026-09-12 is a Saturday; 2026-09-07 is the preceding Monday
	assert.equal(formatListTime('2026-09-12T09:41:00Z', now), '09:41');
	assert.equal(formatListTime('2026-09-07T09:41:00Z', now), 'Mon');
	assert.equal(formatListTime('2026-08-30T09:41:00Z', now), '30 Aug');
});

test('formatReaderTime: "Today 09:41" style', () => {
	const now = new Date('2026-09-12T12:00:00Z');
	assert.equal(formatReaderTime('2026-09-12T09:41:00Z', now), 'Today 09:41');
	assert.equal(formatReaderTime('2026-09-11T09:41:00Z', now), 'Yesterday 09:41');
});

test('initials: two letters from name or email', () => {
	assert.equal(initials('Ada Lovelace', 'ada@x.io'), 'AL');
	assert.equal(initials('', 'ada@zaur.app'), 'AD');
	assert.equal(initials('Cher', 'cher@x.io'), 'CH');
	assert.equal(initials('', ''), '?');
});

test('formatBytes and typeBadge', () => {
	assert.equal(formatBytes(512), '512 B');
	assert.equal(formatBytes(2048), '2.0 KB');
	assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
	assert.equal(typeBadge('application/pdf'), 'PDF');
	assert.equal(typeBadge('image/svg+xml'), 'SVG');
});

test('rows are typed as MessagePreview plus senderLabel', () => {
	const now = new Date('2026-09-12T12:00:00Z');
	const rows: ListRow[] = buildRowGroups([preview()], 'inbox', (e) => e === 'me@zaur.app', now)[0]!.rows;
	assert.equal(rows[0]!.senderLabel, 'Ada Lovelace');
	assert.equal(rows[0]!.senderEmail, 'ada@example.com');
	assert.equal(rows[0]!.messageCount, 1);
});

test('senderEmail follows the counterparty, not the latest message', () => {
	const now = new Date('2026-09-12T12:00:00Z');
	// Sent: the row is labelled "To Bob", so Bob's address seeds the row's colour.
	const sent = buildRowGroups(
		[
			preview({
				from: { name: 'Me', email: 'me@zaur.app' },
				to: [{ name: 'Bob', email: 'bob@x.io' }]
			})
		],
		'sent',
		(e) => e === 'me@zaur.app',
		now
	);
	assert.equal(sent[0]!.rows[0]!.senderEmail, 'bob@x.io');

	// Inbox thread my own reply ends: still the person I am talking to.
	const inbox = buildRowGroups(
		[
			preview({ threadId: 't9', receivedAt: '2026-09-12T09:00:00Z' }),
			preview({
				threadId: 't9',
				receivedAt: '2026-09-12T11:30:00Z',
				from: { name: 'Me', email: 'me@zaur.app' },
				to: [{ name: 'Ada Lovelace', email: 'ada@example.com' }]
			})
		],
		'inbox',
		(e) => e === 'me@zaur.app',
		now
	);
	assert.equal(inbox[0]!.rows[0]!.senderEmail, 'ada@example.com');
});

test('messageCount counts the thread as this folder view holds it', () => {
	const now = new Date('2026-09-12T12:00:00Z');
	const groups = buildRowGroups(
		[
			preview({ threadId: 't1', receivedAt: '2026-09-12T09:00:00Z' }),
			preview({ threadId: 't1', receivedAt: '2026-09-12T10:00:00Z' }),
			preview({ threadId: 't1', receivedAt: '2026-09-12T11:00:00Z' }),
			preview({ threadId: 't2', receivedAt: '2026-09-12T08:00:00Z' })
		],
		'inbox',
		(e) => e === 'me@zaur.app',
		now
	);
	const rows = groups[0]!.rows;
	assert.equal(rows.length, 2);
	assert.equal(rows.find((row) => row.threadId === 't1')!.messageCount, 3);
	assert.equal(rows.find((row) => row.threadId === 't2')!.messageCount, 1);
});

test('attachmentUrl: encodes names that would otherwise break the query', () => {
	const url = attachmentUrl('B123', 'Q2 report (final) & notes.pdf', 'application/pdf');
	assert.match(url, /^\/api\/download\?/);
	const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
	assert.equal(params.get('blobId'), 'B123');
	assert.equal(params.get('name'), 'Q2 report (final) & notes.pdf');
	assert.equal(params.get('type'), 'application/pdf');
});

test('previewKind: what opens in place, and what only downloads', () => {
	const file = (name: string, type: string, size = 1000) => ({ name, type, size });
	assert.equal(previewKind(file('plan.pdf', 'application/pdf')), 'pdf');
	assert.equal(previewKind(file('scan.PDF', 'application/octet-stream')), 'pdf');
	assert.equal(previewKind(file('photo.jpg', 'image/jpeg')), 'image');
	assert.equal(previewKind(file('clip.mp4', 'video/mp4')), 'video');
	assert.equal(previewKind(file('note.wav', 'audio/wav; codecs=1')), 'audio');
	assert.equal(previewKind(file('page.html', 'text/html')), 'text');
	assert.equal(previewKind(file('data.json', 'application/octet-stream')), 'text');
	// Big text downloads; an archive or a document never opens here.
	assert.equal(previewKind(file('huge.log', 'text/plain', 2 * 1024 * 1024)), null);
	assert.equal(previewKind(file('src.zip', 'application/zip')), null);
	assert.equal(previewKind(file('report.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')), null);
});
