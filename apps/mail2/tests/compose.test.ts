import { test } from 'node:test';
import assert from 'node:assert/strict';

// Time-dependent formatting is TZ-sensitive; pin for deterministic tests.
process.env.TZ = 'UTC';
import {
	makeRecipient,
	commitRecipient,
	highlightedSuggestion,
	parseAddressList,
	parseRecipients,
	splitRecipients,
	uniqueRecipients,
	outgoingRecipients,
	filterContacts
} from '../src/lib/compose/recipients.ts';
import {
	formatWhen,
	replySeed,
	replyRecipients,
	replyAllRecipients,
	answerLink,
	draftSeed,
	forwardSeed,
	signatureBlock,
	withSignature
} from '../src/lib/compose/quote.ts';
import {
	computeStep,
	bodyHeightPx,
	computeAutoHeight,
	maximizedRect,
	openingPosition,
	clampPanel,
	fitPanel,
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
		from: '',
		signature: '',
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
		bodyHtml: '',
		plain: false,
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
		commitRecipient('ad', { name: 'Ada', email: 'ada@x.com', meta: 'recent' }).recipients,
		[{ name: 'Ada', email: 'ada@x.com', meta: 'recent' }]
	);
	assert.deepEqual(commitRecipient('bob@y.com', null), {
		recipients: [{ name: '', email: 'bob@y.com', meta: '' }],
		remaining: ''
	});
	// Not an address: nobody is added, and the text stays in the field.
	assert.deepEqual(commitRecipient('bob', null), { recipients: [], remaining: 'bob' });
});

test('splitRecipients: a pasted or typed list is one chip per address, however it is separated', () => {
	const emails = (text: string) => splitRecipients(text).recipients.map((r) => r.email);
	const three = ['a@x.io', 'b@x.io', 'c@x.io'];
	assert.deepEqual(emails('a@x.io, b@x.io; c@x.io'), three);
	assert.deepEqual(emails('a@x.io b@x.io  c@x.io'), three);
	assert.deepEqual(emails('a@x.io\nb@x.io\r\nc@x.io\n'), three);
	assert.deepEqual(emails('a@x.io,b@x.io;c@x.io;'), three);
	assert.deepEqual(emails('<a@x.io> <b@x.io>, mailto:c@x.io'), three);
	// Names ride with their own address, never with a neighbour's.
	assert.deepEqual(splitRecipients('Bob Builder <bob@x.io>, carol@x.io; "Hobday, Annie" <annie@x.io> Dave dave@x.io').recipients, [
		{ name: 'Bob Builder', email: 'bob@x.io', meta: '' },
		{ name: '', email: 'carol@x.io', meta: '' },
		{ name: 'Hobday, Annie', email: 'annie@x.io', meta: '' },
		{ name: 'Dave', email: 'dave@x.io', meta: '' }
	]);
	// Outlook's list: with semicolons between the entries, the commas are in the names.
	assert.deepEqual(splitRecipients('Doe, Jane <j@x.io>; Smith, John <s@x.io>'), {
		recipients: [
			{ name: 'Doe, Jane', email: 'j@x.io', meta: '' },
			{ name: 'Smith, John', email: 's@x.io', meta: '' }
		],
		rest: ''
	});
	assert.deepEqual(emails('a@x.io, Bob <b@x.io>; c@x.io'), three);
	// An address as it stands in running text, and one used as a name.
	assert.deepEqual(emails('Jane Doe (a@x.io), mailto:b@x.io?subject=Hi, write to c@x.io!'), three);
	assert.deepEqual(splitRecipients('john@work <john@x.io>').recipients, [{ name: 'john@work', email: 'john@x.io', meta: '' }]);
	// The single-chip reader refuses a list: it used to name one chip after all of it.
	assert.equal(makeRecipient('a@x.io, b@x.io'), null);
	assert.equal(makeRecipient('a@x.io b@x.io'), null);
});

test('uniqueRecipients: an address that came in twice is one chip, whatever its case', () => {
	const ada = { name: 'Ada', email: 'ada@x.io', meta: '' };
	assert.deepEqual(uniqueRecipients([ada, { name: '', email: 'ADA@x.io', meta: '' }, { name: 'Bob', email: 'bob@x.io', meta: '' }, ada]), [
		ada,
		{ name: 'Bob', email: 'bob@x.io', meta: '' }
	]);
	// The split path never makes one in the first place.
	assert.equal(splitRecipients('ada@x.io, Ada <ADA@x.io>; ada@x.io').recipients.length, 1);
});

test('splitRecipients: what is not an address is handed back, not dropped', () => {
	assert.deepEqual(splitRecipients('a@x.io, not-an-address'), {
		recipients: [{ name: '', email: 'a@x.io', meta: '' }],
		rest: 'not-an-address'
	});
	assert.deepEqual(splitRecipients('Bob Builder'), { recipients: [], rest: 'Bob Builder' });
	assert.deepEqual(splitRecipients('bob@, @x.io, a@b@c'), { recipients: [], rest: 'bob@, @x.io, a@b@c' });
	assert.deepEqual(splitRecipients('  '), { recipients: [], rest: '' });
});

test('highlightedSuggestion: a closed list commits nobody, whoever sorts first', () => {
	const book = [
		{ name: '42 Ltd', email: 'hello@42.example', meta: 'Contact' },
		{ name: 'Ada', email: 'ada@x.com', meta: 'recent' }
	];
	// Tab or Enter in an empty field: the list is closed, so nobody is added.
	assert.equal(highlightedSuggestion(false, book, 0), null);
	assert.deepEqual(commitRecipient('', highlightedSuggestion(false, book, 0)).recipients, []);
	assert.deepEqual(highlightedSuggestion(true, book, 1), book[1]);
	assert.equal(highlightedSuggestion(true, [], 0), null);
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

test('outgoingRecipients: the wire form of a chip list — deduped case-insensitively, names kept', () => {
	assert.deepEqual(
		outgoingRecipients([
			{ name: 'Ada Lovelace', email: 'Ada@X.com', meta: '' },
			chip('ada@x.com'),
			chip(''),
			chip('bob@y.com'),
			// A chip "named" by its own address has no name worth a header.
			{ name: 'cara@z.com', email: 'cara@z.com', meta: '' }
		]),
		[{ name: 'Ada Lovelace', email: 'Ada@X.com' }, { email: 'bob@y.com' }, { email: 'cara@z.com' }]
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

test('replyAllRecipients: the answered message only — sender and To in To, Cc stays Cc, without me', () => {
	const me = new Set(['me@zaur.app']);
	const message = detail({
		from: { name: 'Bob', email: 'bob@y.com' },
		to: [
			{ name: '', email: 'ada@x.com' },
			{ name: '', email: 'ME@zaur.app' }
		],
		cc: [
			{ name: 'Cara', email: 'cara@z.com' },
			{ name: '', email: 'Ada@x.com' }
		]
	});
	const all = replyAllRecipients(message, me);
	assert.deepEqual(all.to.map((r) => r.email), ['bob@y.com', 'ada@x.com']);
	assert.deepEqual(all.cc.map((r) => r.email), ['cara@z.com']);

	// One I sent goes back to the people I sent it to; a note to myself, to me.
	const mine = detail({ from: { name: 'Me', email: 'me@zaur.app' }, to: [{ name: 'Ada', email: 'ada@x.com' }] });
	assert.deepEqual(replyAllRecipients(mine, me).to.map((r) => r.email), ['ada@x.com']);
	const note = detail({ from: { name: 'Me', email: 'me@zaur.app' }, to: [{ name: 'Me', email: 'me@zaur.app' }] });
	assert.deepEqual(replyAllRecipients(note, me).to.map((r) => r.email), ['me@zaur.app']);
});

test('replyRecipients: Reply-To over From; my own message goes to the people I sent it to', () => {
	const mine = new Set(['me@zaur.app', 'alias@zaur.app']);
	const me = { name: 'Me', email: 'me@zaur.app' };
	const bob = { name: 'Bob', email: 'bob@y.com' };
	const support = { name: 'Support', email: 'support@shop.example' };
	const robot = { name: 'Robot', email: 'noreply@shop.example' };
	assert.deepEqual(replyRecipients(detail({ to: [me] }), mine), [{ name: 'Ada', email: 'ada@example.com' }]);
	assert.deepEqual(replyRecipients(detail({ from: robot, replyTo: [support], to: [me] }), mine), [support]);
	// Sent by me (from an alias too): a follow-up to its To, not a letter to myself.
	assert.deepEqual(replyRecipients(detail({ from: { name: 'Me', email: 'Alias@zaur.app' }, to: [bob, me], cc: [support] }), mine), [bob]);
	// A note to myself has nobody else.
	assert.deepEqual(replyRecipients(detail({ from: me, to: [me] }), mine), [me]);

	// Reply all: Reply-To takes the sender's place, the rest is unchanged.
	assert.deepEqual(replyAllRecipients(detail({ from: robot, replyTo: [support], to: [me, bob], cc: [{ name: 'Cara', email: 'cara@z.com' }] }), mine), {
		to: [support, bob],
		cc: [{ name: 'Cara', email: 'cara@z.com' }]
	});
});

test('answerLink: a reply threads under the message; a forward only names it; a draft keeps the link', () => {
	const parent = detail({ id: 'e9', messageId: 'c@host', references: ['a@host', 'b@host'], inReplyTo: ['b@host'] });
	assert.deepEqual(answerLink(parent, false), { emailId: 'e9', messageId: 'c@host', references: ['a@host', 'b@host', 'c@host'] });
	assert.deepEqual(answerLink(parent, true), { emailId: 'e9', messageId: 'c@host', forward: true });
	// No References on the parent: its In-Reply-To stands in (RFC 5322 §3.6.4).
	assert.deepEqual(answerLink(detail({ messageId: 'c@host', inReplyTo: ['b@host'] }), false)?.references, ['b@host', 'c@host']);
	assert.deepEqual(answerLink(detail({ messageId: 'c@host' }), false)?.references, ['c@host']);
	assert.equal(answerLink(detail(), false), undefined);

	// A reply saved to Drafts and reopened: the headers it was saved with come back.
	const saved = detail({ id: 'd1', messageId: 'draft@host', inReplyTo: ['c@host'], references: ['a@host', 'b@host', 'c@host'] });
	assert.deepEqual(draftSeed(saved).answers, { messageId: 'c@host', references: ['a@host', 'b@host', 'c@host'] });
	assert.equal(draftSeed(detail()).answers, undefined);
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
	assert.equal(bodyHeightPx(draft({ to: [chip('a@x.com')], subject: 'Hi' })), 340);
	assert.equal(bodyHeightPx(draft({ bodyOpened: true })), 340);
	assert.equal(bodyHeightPx(draft({ stage: 'maximized' })), 340);
	assert.equal(computeStep(draft({ to: [chip('a@x.com')] })), 1);
	assert.equal(computeStep(draft({ to: [chip('a@x.com')], subject: 'Hi' })), 2);
});

test('computeAutoHeight matches the spec formula', () => {
	// 45 header + 44 To + 45 subject + 84 body + 53 actions = 271
	assert.equal(computeAutoHeight(draft()), 271);
	// one chip adds one 32px row; recipient+subject grow the body to 340
	assert.equal(
		computeAutoHeight(draft({ to: [chip('a@x.com')], subject: 'Hi' })),
		45 + 44 + 32 + 45 + 340 + 53
	);
	// A shown Cc row costs the same 44 as To, plus a chip row once it has one.
	assert.equal(
		computeAutoHeight(draft({ to: [chip('a@x.com')], subject: 'Hi', ccShown: true, sendError: 'x' })),
		45 + 44 + 32 + 45 + 340 + 44 + 34 + 53
	);
	assert.equal(
		computeAutoHeight(
			draft({ to: [chip('a@x.com')], subject: 'Hi', ccShown: true, cc: [chip('c@x.com')] })
		),
		45 + 44 + 32 + 45 + 340 + 44 + 32 + 53
	);
	// Attachments add the strip: one row until the panel has measured it, then as drawn.
	const attached = draft({ to: [chip('a@x.com')], subject: 'Hi', attachments: [{ id: 'a', name: 'a.pdf', type: 'application/pdf', size: 1, blobId: 'b', status: 'ready' }] });
	assert.equal(computeAutoHeight(attached), 45 + 44 + 32 + 45 + 340 + 54 + 53);
	assert.equal(computeAutoHeight(attached, 92), 45 + 44 + 32 + 45 + 340 + 92 + 53);
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
	const centreX = (shell.w - PANEL_DEFAULT_W) / 2; // 320
	const centreY = (shell.h - PANEL_TYPICAL_H) / 2; // 185

	const fromLeft = openingPosition({ left: 180, top: 100, right: 200, bottom: 134 }, shell.w, shell.h, 0);
	assert.deepEqual(fromLeft, { x: 95, y: 120 });
	const fromRight = openingPosition(
		{ left: 1240, top: 100, right: 1300, bottom: 134 },
		shell.w,
		shell.h,
		0
	);
	assert.deepEqual(fromRight, { x: 462, y: 120 });

	// The lean follows the button, but never travels all the way to it.
	assert.ok(fromLeft.x < centreX && fromRight.x > centreX, 'each leans toward its button');
	assert.ok(Math.abs(fromLeft.x - centreX) < Math.abs(-190 - centreX), 'but stays nearer the centre');
	assert.ok(Math.abs(fromRight.x - centreX) < Math.abs(890 - centreX), 'but stays nearer the centre');
	assert.ok(fromLeft.y > centreY - PANEL_TYPICAL_H / 2, 'and does not ride the top edge');

	const cascaded = openingPosition({ left: 180, top: 100, right: 200, bottom: 134 }, shell.w, shell.h, 1);
	assert.deepEqual(cascaded, { x: 121, y: 146 });
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

test('openingPosition: never over the top bar, even on a short shell', () => {
	// 1024x700, the sidebar's New message button: the first panel's cascade used to put it at y=39.
	const { y } = openingPosition({ left: 12, top: 640, right: 228, bottom: 674 }, 1024, 700, 0);
	assert.ok(y >= 64, `below the 52px bar: ${y}`);
	assert.equal(openingPosition({ left: 0, top: 0, right: 30, bottom: 30 }, 1024, 700, 0).y, 64);
});

test('fitPanel: a stored rect slides back into a shrunken shell, and shrinks only if it must', () => {
	// Room enough: untouched.
	assert.deepEqual(fitPanel({ x: 278, y: 120, w: 760, h: 460 }, 1440, 900), { x: 278, y: 120, w: 760, h: 460 });
	// 1440 → 1024: slides left, keeps its width.
	assert.deepEqual(fitPanel({ x: 278, y: 120, w: 760, h: 460 }, 1024, 700), { x: 256, y: 120, w: 760, h: 460 });
	// → 800x600: still whole, against the edge.
	assert.deepEqual(fitPanel({ x: 278, y: 300, w: 760, h: 460 }, 800, 600), { x: 32, y: 132, w: 760, h: 460 });
	// Smaller than the panel: shrinks to the shell.
	assert.deepEqual(fitPanel({ x: 278, y: 300, w: 960, h: 800 }, 800, 600), { x: 8, y: 60, w: 784, h: 532 });
	// Parked over the top bar (search, the section tabs): it comes down under it.
	assert.deepEqual(fitPanel({ x: 8, y: 8, w: 760, h: 460 }, 1440, 900), { x: 8, y: 60, w: 760, h: 460 });
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
	// What a remote command throws: a proxy's 502 while the app restarts queues, the app's own refusal does not.
	assert.equal(classifySendFailure({ status: 502, body: { message: 'Bad Gateway' } }), 'network');
	assert.equal(classifySendFailure({ status: 502, body: { message: 'The server refused the message.' } }), 'fatal');
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

test('signature: "-- " delimiter, under new text, above a quote', () => {
	assert.equal(signatureBlock('  '), '');
	const block = signatureBlock('Ada\nZaur ');
	assert.equal(block, '\n\n-- \nAda\nZaur');
	assert.equal(withSignature('', block), block);
	assert.equal(withSignature('Invite', block), `Invite${block}`);
	const quote = '\n\n---\nOn Monday, Bob wrote:\nHi';
	assert.equal(withSignature(quote, block), `${block}${quote}`);
});
