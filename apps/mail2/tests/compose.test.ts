import { test } from 'node:test';
import assert from 'node:assert/strict';

// Time-dependent formatting is TZ-sensitive; pin for deterministic tests.
process.env.TZ = 'UTC';
import {
	makeRecipient,
	commitRecipient,
	parseAddressList,
	parseRecipients,
	recipientEmails,
	filterContacts
} from '../src/lib/compose/recipients.ts';
import { formatWhen, replySeed, replyAllRecipients, forwardSeed } from '../src/lib/compose/quote.ts';
import {
	computeStep,
	bodyHeightPx,
	computeAutoHeight,
	maximizedRect,
	openingPosition,
	clampPanel,
	PANEL_DEFAULT_W,
	PANEL_MAX_W,
	PANEL_TYPICAL_H
} from '../src/lib/compose/layout.ts';
import { classifySendFailure } from '../src/lib/compose/outbox.ts';
import {
	buildSchedulePresets,
	customSendTimeMin,
	isSendAtValid,
	tomorrow9ISO
} from '../src/lib/compose/schedule.ts';
import type { Draft, Recipient } from '../src/lib/compose/types.ts';
import type { MessageDetail } from '@zaur/mail-core';

function chip(email: string, name = ''): Recipient {
	return { name, email, meta: '' };
}

function draft(overrides: Partial<Draft> = {}): Draft {
	return {
		id: 'd1',
		kind: 'new',
		to: [],
		toInput: '',
		toOpen: false,
		toHi: 0,
		cc: [],
		ccInput: '',
		ccOpen: false,
		ccHi: 0,
		bcc: [],
		bccInput: '',
		bccOpen: false,
		bccHi: 0,
		ccShown: false,
		bccShown: false,
		subject: '',
		body: '',
		attachments: [],
		sendAt: null,
		bodyOpened: false,
		stage: 'default',
		x: 24,
		y: 76,
		w: PANEL_DEFAULT_W,
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

test('parseRecipients: keeps the names an address list carries, dedupes on address', () => {
	assert.deepEqual(parseRecipients('Cara <cara@z.com>; bob@y.com, CARA@z.com'), [
		{ name: 'Cara', email: 'cara@z.com', meta: '' },
		{ name: '', email: 'bob@y.com', meta: '' }
	]);
	assert.deepEqual(parseRecipients(''), []);
});

test('recipientEmails: the wire form of a chip list, deduped case-insensitively', () => {
	assert.deepEqual(
		recipientEmails([chip('Ada@X.com'), chip('ada@x.com'), chip(''), chip('bob@y.com')]),
		['Ada@X.com', 'bob@y.com']
	);
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
	// 45 header + 44 To + 45 subject + 84 body + 53 actions = 271
	assert.equal(computeAutoHeight(draft()), 271);
	// one chip adds one 32px row; recipient+subject grow the body to 228
	assert.equal(
		computeAutoHeight(draft({ to: [chip('a@x.com')], subject: 'Hi' })),
		45 + 44 + 32 + 45 + 228 + 53
	);
	// A shown Cc row costs the same 44 as To, plus a chip row once it has one.
	assert.equal(
		computeAutoHeight(draft({ to: [chip('a@x.com')], subject: 'Hi', ccShown: true, sendError: 'x' })),
		45 + 44 + 32 + 45 + 228 + 44 + 34 + 53
	);
	assert.equal(
		computeAutoHeight(
			draft({ to: [chip('a@x.com')], subject: 'Hi', ccShown: true, cc: [chip('c@x.com')] })
		),
		45 + 44 + 32 + 45 + 228 + 44 + 32 + 53
	);
});

test('maximizedRect: fills the pane between the top bar and the status line', () => {
	assert.deepEqual(maximizedRect(1400, 900), { x: 220, y: 64, w: 960, h: 788 });
	// A short shell has no room for the chrome inset — fall back to the margin.
	assert.deepEqual(maximizedRect(500, 400), { x: 12, y: 12, w: 476, h: 340 });
	// Never wider than the cap, however wide the shell gets.
	assert.equal(maximizedRect(2400, 1200).w, PANEL_MAX_W);
});

test('openingPosition: leans from the shell centre toward the button, cascades', () => {
	const shell = { w: 1400, h: 900 };
	const centreX = (shell.w - PANEL_DEFAULT_W) / 2; // 360
	const centreY = (shell.h - PANEL_TYPICAL_H) / 2; // 240

	const fromLeft = openingPosition({ left: 180, top: 100, right: 200, bottom: 134 }, shell.w, shell.h, 0);
	assert.deepEqual(fromLeft, { x: 135, y: 157 });
	const fromRight = openingPosition(
		{ left: 1240, top: 100, right: 1300, bottom: 134 },
		shell.w,
		shell.h,
		0
	);
	assert.deepEqual(fromRight, { x: 502, y: 157 });

	// The lean follows the button, but never travels all the way to it.
	assert.ok(fromLeft.x < centreX && fromRight.x > centreX, 'each leans toward its button');
	assert.ok(Math.abs(fromLeft.x - centreX) < Math.abs(-90 - centreX), 'but stays nearer the centre');
	assert.ok(Math.abs(fromRight.x - centreX) < Math.abs(990 - centreX), 'but stays nearer the centre');
	assert.ok(fromLeft.y > centreY - PANEL_TYPICAL_H / 2, 'and does not ride the top edge');

	const cascaded = openingPosition({ left: 180, top: 100, right: 200, bottom: 134 }, shell.w, shell.h, 1);
	assert.deepEqual(cascaded, { x: 161, y: 183 });
});

test('openingPosition: a corner button still opens fully inside the shell', () => {
	for (const button of [
		{ left: 0, top: 0, right: 30, bottom: 30 },
		{ left: 1370, top: 0, right: 1400, bottom: 30 },
		{ left: 1370, top: 870, right: 1400, bottom: 900 },
		{ left: 0, top: 870, right: 30, bottom: 900 }
	]) {
		for (const openCount of [0, 1, 2, 3, 4]) {
			const { x, y } = openingPosition(button, 1400, 900, openCount);
			assert.ok(x >= 8 && x + PANEL_DEFAULT_W <= 1392, `x in shell: ${x}`);
			assert.ok(y >= 12 && y + PANEL_TYPICAL_H <= 892, `y in shell: ${y}`);
		}
	}
});

test('clampPanel: enforces min size and keeps the panel inside the shell', () => {
	const clamped = clampPanel({ x: 0, y: 0, w: 100, h: 50 }, 1400, 900);
	assert.deepEqual(clamped, { x: 8, y: 12, w: 420, h: 240 });
	const pushedOut = clampPanel({ x: 1390, y: 890, w: 560, h: 460 }, 1400, 900);
	assert.equal(pushedOut.x + pushedOut.w <= 1392, true); // rootW - EDGE
});

test('a typed address commits without Enter; partial text does not', () => {
	// What commitPendingTo gates on: blur commits only a complete address.
	assert.ok(makeRecipient('ada@example.com'));
	assert.ok(makeRecipient('Ada Lovelace <ada@example.com>'));
	assert.equal(makeRecipient('ada'), null);
	assert.equal(makeRecipient('  '), null);
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

test('buildSchedulePresets: relative presets around a morning', () => {
	const now = Date.UTC(2026, 8, 14, 9, 0, 0);
	const presets = buildSchedulePresets(now);
	assert.equal(presets[0]?.label, 'In 1 hour');
	assert.equal(presets[0]?.date.getTime(), now + 3_600_000);
	// 18:00 is more than five minutes out at 09:00, so the evening preset shows.
	assert.equal(presets[1]?.label, 'This evening');
	assert.equal(presets[1]?.date.getUTCHours(), 18);
	const morning = presets.at(-1)!;
	assert.equal(morning.label, 'Tomorrow morning');
	assert.equal(morning.date.toISOString(), '2026-09-15T09:00:00.000Z');
});

test('buildSchedulePresets: no evening preset late in the day', () => {
	const now = Date.UTC(2026, 8, 14, 17, 58, 0);
	assert.deepEqual(
		buildSchedulePresets(now).map((preset) => preset.label),
		['In 1 hour', 'Tomorrow morning']
	);
});

test('isSendAtValid: the server needs a minute of lead time', () => {
	const now = Date.UTC(2026, 8, 14, 12, 0, 0);
	assert.equal(isSendAtValid(new Date(now + 59_000), now), false);
	assert.equal(isSendAtValid(new Date(now + 60_000), now), true);
});

test('customSendTimeMin: local datetime-local value five minutes out', () => {
	const now = Date.UTC(2026, 8, 14, 12, 0, 0);
	assert.equal(customSendTimeMin(now), '2026-09-14T12:05');
});
