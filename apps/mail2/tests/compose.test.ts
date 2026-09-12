import { test } from 'node:test';
import assert from 'node:assert/strict';

// Time-dependent formatting is TZ-sensitive; pin for deterministic tests.
process.env.TZ = 'UTC';
import { makeRecipient, commitRecipient, parseAddressList, filterContacts } from '../src/lib/compose/recipients.ts';
import { formatWhen, replySeed, replyAllRecipients, forwardSeed } from '../src/lib/compose/quote.ts';
import {
	computeStep,
	bodyHeightPx,
	computeAutoHeight,
	maximizedRect,
	openingPosition,
	clampPanel
} from '../src/lib/compose/layout.ts';
import { classifySendFailure } from '../src/lib/compose/outbox.ts';
import { tomorrow9ISO } from '../src/lib/compose/schedule.ts';
import type { Draft, Recipient } from '../src/lib/compose/types.ts';
import type { MessageDetail } from '@zaur/mail-core';

function chip(email: string, name = ''): Recipient {
	return { name, email, meta: '' };
}

function draft(overrides: Partial<Draft> = {}): Draft {
	return {
		id: 'd1',
		to: [],
		toInput: '',
		toOpen: false,
		toHi: 0,
		cc: '',
		bcc: '',
		ccOpen: false,
		bccOpen: false,
		subject: '',
		body: '',
		attachments: [],
		scheduled: false,
		bodyOpened: false,
		stage: 'default',
		x: 24,
		y: 76,
		w: 560,
		h: 460,
		saved: null,
		auto: true,
		gesture: false,
		z: 70,
		focusTarget: 'to',
		sending: false,
		sendError: null,
		jmapDraftId: null,
		draftSaving: false,
		draftSavedAt: null,
		...overrides
	};
}

function detail(overrides: Partial<MessageDetail> = {}): MessageDetail {
	return {
		id: 'm1',
		threadId: 't1',
		mailboxId: 'inbox',
		subject: 'Hello',
		from: { name: 'Ada', email: 'ada@example.com' },
		to: [],
		cc: [],
		bcc: [],
		bodyText: 'Hi there',
		attachments: [],
		receivedAt: '2026-09-10T09:30:00.000Z',
		preview: '',
		hasAttachment: false,
		...overrides
	} as unknown as MessageDetail;
}

// --- recipients ---

test('makeRecipient: bare email, angle form, space form, rejects non-addresses', () => {
	assert.deepEqual(makeRecipient('a@b.com'), { name: '', email: 'a@b.com', meta: '' });
	assert.deepEqual(makeRecipient('Ada L <ada@x.com>'), { name: 'Ada L', email: 'ada@x.com', meta: '' });
	assert.deepEqual(makeRecipient('Ada ada@x.com'), { name: 'Ada', email: 'ada@x.com', meta: '' });
	assert.equal(makeRecipient('just words'), null);
	assert.equal(makeRecipient('   '), null);
	assert.deepEqual(makeRecipient('a@b.com,'), { name: '', email: 'a@b.com', meta: '' });
});

test('commitRecipient: suggestion wins; free-form needs an address; plain words commit nothing', () => {
	assert.deepEqual(
		commitRecipient('ad', { name: 'Ada', email: 'ada@x.com', meta: 'recent' }).recipient,
		{ name: 'Ada', email: 'ada@x.com', meta: 'recent' }
	);
	assert.deepEqual(commitRecipient('bob@y.com', null).recipient, {
		name: '',
		email: 'bob@y.com',
		meta: ''
	});
	assert.equal(commitRecipient('bob', null).recipient, null);
});

test('parseAddressList: splits on commas/semicolons and dedupes case-insensitively', () => {
	assert.deepEqual(parseAddressList('a@x.com, B@Y.com; b@y.com ,c@z.com'), [
		'a@x.com',
		'B@Y.com',
		'c@z.com'
	]);
	assert.deepEqual(parseAddressList('not an address'), []);
});

test('filterContacts: matches name or email, excludes existing chips, caps results', () => {
	const contacts = [
		{ name: 'Ada', email: 'ada@x.com', meta: '' },
		{ name: 'Bob', email: 'bob@y.com', meta: '' },
		{ name: 'Adaline', email: 'adaline@z.com', meta: '' }
	];
	assert.deepEqual(filterContacts(contacts, 'ada', []).map((c) => c.email), [
		'ada@x.com',
		'adaline@z.com'
	]);
	assert.deepEqual(filterContacts(contacts, '', [chip('ada@x.com')]).map((c) => c.email), [
		'bob@y.com',
		'adaline@z.com'
	]);
	assert.equal(filterContacts(contacts, 'ada', [], 1).length, 1);
});

// --- quotes ---

test('replySeed: Re: prefix and webmail 1.0 plain-text quote shape', () => {
	const seed = replySeed(detail(), 'en-GB');
	assert.equal(seed.subject, 'Re: Hello');
	assert.match(seed.body, /^\n\n---\nOn \d{1,2} \w+ 2026, \d{2}:\d{2}, Ada wrote:\nHi there$/);
	assert.equal(replySeed(detail({ subject: 'Re: Hello' })).subject, 'Re: Hello');
});

test('replyAllRecipients: walks the thread, skips me, dedupes case-insensitively', () => {
	const thread = [
		detail({ from: { name: 'Ada', email: 'ada@x.com' }, to: [{ name: '', email: 'me@zaur.app' }] }),
		detail({
			from: { name: 'Bob', email: 'bob@y.com' },
			to: [
				{ name: '', email: 'ada@x.com' },
				{ name: '', email: 'ME@zaur.app' }
			],
			cc: [{ name: 'Cara', email: 'cara@z.com' }]
		})
	];
	assert.deepEqual(
		replyAllRecipients(thread, new Set(['me@zaur.app'])).map((r) => r.email),
		['ada@x.com', 'bob@y.com', 'cara@z.com']
	);
});

test('forwardSeed: Fwd: prefix and forwarded header block', () => {
	const seed = forwardSeed(
		detail({ to: [{ name: 'Bob', email: 'bob@y.com' }] }),
		'en-GB'
	);
	assert.equal(seed.subject, 'Fwd: Hello');
	assert.match(
		seed.body,
		/^\n\n---\nForwarded message:\nFrom: Ada <ada@example\.com>\nDate: .+\nSubject: Hello\nTo: Bob\n\nHi there$/
	);
});

test('formatWhen renders medium date + short time', () => {
	assert.match(formatWhen('2026-09-10T09:30:00.000Z', 'en-GB'), /^10 \w+ 2026, 09:30$/);
});

// --- layout ---

test('computeStep and bodyHeightPx follow the quiet-guidance ladder', () => {
	assert.equal(computeStep(draft()), 0);
	assert.equal(bodyHeightPx(draft()), 84);
	assert.equal(bodyHeightPx(draft({ to: [chip('a@x.com')] })), 112);
	assert.equal(bodyHeightPx(draft({ to: [chip('a@x.com')], subject: 'Hi' })), 228);
	assert.equal(bodyHeightPx(draft({ bodyOpened: true })), 228);
	assert.equal(bodyHeightPx(draft({ stage: 'maximized' })), 340);
	assert.equal(computeStep(draft({ to: [chip('a@x.com')] })), 1);
	assert.equal(computeStep(draft({ to: [chip('a@x.com')], subject: 'Hi' })), 2);
});

test('computeAutoHeight matches the spec formula', () => {
	// 45 header + 28 To + 45 subject + 84 body + 53 actions = 255
	assert.equal(computeAutoHeight(draft()), 255);
	// one chip adds one 32px row; recipient+subject grow the body to 228
	assert.equal(
		computeAutoHeight(draft({ to: [chip('a@x.com')], subject: 'Hi' })),
		45 + 28 + 32 + 45 + 228 + 53
	);
	assert.equal(
		computeAutoHeight(draft({ to: [chip('a@x.com')], subject: 'Hi', ccOpen: true, sendError: 'x' })),
		45 + 28 + 32 + 45 + 228 + 45 + 34 + 53
	);
});

test('maximizedRect: centered and clamped on large and small shells', () => {
	assert.deepEqual(maximizedRect(1400, 900), { x: 330, y: 76, w: 740, h: 620 });
	const small = maximizedRect(500, 400);
	assert.equal(small.w, 452);
	assert.equal(small.h, 268);
	assert.equal(small.x, 24);
	assert.equal(small.y, 76);
});

test('openingPosition: right of the button, flips left without room, cascades', () => {
	const shell = { w: 1400, h: 900 };
	const pos = openingPosition({ left: 180, top: 100, right: 200, bottom: 134 }, shell.w, shell.h, 0);
	assert.deepEqual(pos, { x: 214, y: 92 });
	const flipped = openingPosition(
		{ left: 1240, top: 100, right: 1300, bottom: 134 },
		shell.w,
		shell.h,
		0
	);
	assert.equal(flipped.x, 666); // 1240 - 560 - 14
	const cascaded = openingPosition({ left: 180, top: 100, right: 200, bottom: 134 }, shell.w, shell.h, 1);
	assert.deepEqual(cascaded, { x: 240, y: 118 });
});

test('clampPanel: enforces min size and keeps the panel inside the shell', () => {
	const clamped = clampPanel({ x: 0, y: 0, w: 100, h: 50 }, 1400, 900);
	assert.deepEqual(clamped, { x: 8, y: 12, w: 420, h: 240 });
	const pushedOut = clampPanel({ x: 1390, y: 890, w: 560, h: 460 }, 1400, 900);
	assert.equal(pushedOut.x + pushedOut.w <= 1392, true); // rootW - EDGE
});

// --- outbox ---

test('classifySendFailure: connectivity failures queue, server rejections do not', () => {
	assert.equal(classifySendFailure(new TypeError('Failed to fetch')), 'network');
	assert.equal(classifySendFailure(new Error('fetch failed')), 'network');
	assert.equal(classifySendFailure(new Error('502 Bad Gateway')), 'network');
	assert.equal(classifySendFailure(new Error('Failed to send email')), 'fatal');
	assert.equal(classifySendFailure(new Error('No sent mailbox found')), 'fatal');
	assert.equal(classifySendFailure('weird'), 'fatal');
});

// --- scheduling ---

test('tomorrow9ISO: next day at 09:00 local', () => {
	const now = Date.UTC(2026, 8, 12, 23, 30, 0);
	assert.equal(tomorrow9ISO(now), '2026-09-13T09:00:00.000Z');
});
