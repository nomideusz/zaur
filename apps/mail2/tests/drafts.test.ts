import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	DRAFT_CONTENT_KEYS,
	buildDraftSaveInput,
	draftContentSignature,
	hasDraftContent
} from '../src/lib/compose/draft-save.ts';
import { draftSeed } from '../src/lib/compose/quote.ts';
import { attachmentFromServer } from '../src/lib/compose/attachments.ts';
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
		mailboxId: 'drafts',
		subject: 'Hello',
		from: { name: 'Me', email: 'me@zaur.app' },
		to: [{ name: 'Ada', email: 'ada@example.com' }],
		cc: [{ name: '', email: 'cara@z.com' }, { name: '', email: 'bob@y.com' }],
		bcc: [{ name: '', email: 'hidden@z.com' }],
		bodyText: 'Half-written body',
		attachments: [],
		receivedAt: '2026-09-10T09:30:00.000Z',
		preview: '',
		hasAttachment: false,
		...overrides
	} as unknown as MessageDetail;
}

// --- autosave bookkeeping ---

test('DRAFT_CONTENT_KEYS: content only — no toInput, no geometry', () => {
	assert.deepEqual([...DRAFT_CONTENT_KEYS].sort(), [
		'attachments',
		'bcc',
		'body',
		'cc',
		'subject',
		'to'
	]);
	assert.equal(DRAFT_CONTENT_KEYS.has('toInput'), false);
	assert.equal(DRAFT_CONTENT_KEYS.has('x'), false);
	assert.equal(DRAFT_CONTENT_KEYS.has('h'), false);
});

test('buildDraftSaveInput: dedupes to, splits cc/bcc, passes content through', () => {
	const input = buildDraftSaveInput(
		draft({
			to: [chip('Ada@X.com'), chip('ada@x.com'), chip('', ''), chip('bob@y.com')],
			cc: 'cara@z.com, Cara <cara@z.com>',
			bcc: 'hidden@z.com',
			subject: 'Hi',
			body: 'Body',
			jmapDraftId: 'm-draft-1',
			attachments: [
				attachmentFromServer({ blobId: 'blob-1', name: 'report.pdf', type: 'application/pdf', size: 1024 })
			]
		})
	);
	assert.deepEqual(input.to, ['Ada@X.com', 'bob@y.com']);
	assert.deepEqual(input.cc, ['cara@z.com']);
	assert.deepEqual(input.bcc, ['hidden@z.com']);
	assert.equal(input.subject, 'Hi');
	assert.equal(input.body, 'Body');
	assert.equal(input.jmapDraftId, 'm-draft-1');
	assert.deepEqual(input.attachments, [
		{ blobId: 'blob-1', name: 'report.pdf', type: 'application/pdf', size: 1024 }
	]);
});

test('draftContentSignature: same content, different jmapDraftId → same signature', () => {
	const saved = draft({ subject: 'Hi', body: 'Body', jmapDraftId: 'm-draft-1' });
	const resaved = draft({ subject: 'Hi', body: 'Body', jmapDraftId: 'm-draft-2' });
	assert.equal(draftContentSignature(saved), draftContentSignature(resaved));
	assert.notEqual(
		draftContentSignature(saved),
		draftContentSignature(draft({ subject: 'Hi', body: 'Body v2' }))
	);
	// Transient typing state never changes the signature.
	assert.equal(
		draftContentSignature(draft({ to: [chip('a@x.com')] })),
		draftContentSignature(draft({ to: [chip('a@x.com')], toInput: 'a' }))
	);
});

test('hasDraftContent: empty draft is empty, whitespace does not count', () => {
	assert.equal(hasDraftContent(draft()), false);
	assert.equal(hasDraftContent(draft({ cc: '  ', bcc: '  ', subject: '  ', body: '\n\t' })), false);
	assert.equal(hasDraftContent(draft({ to: [chip('a@x.com')] })), true);
	assert.equal(hasDraftContent(draft({ cc: 'a@x.com' })), true);
	assert.equal(hasDraftContent(draft({ bcc: 'a@x.com' })), true);
	assert.equal(hasDraftContent(draft({ subject: 'Hi' })), true);
	assert.equal(hasDraftContent(draft({ body: 'x' })), true);
	assert.equal(
		hasDraftContent(
			draft({ attachments: [attachmentFromServer({ blobId: 'b', name: 'f', type: 't', size: 1 })] })
		),
		true
	);
});

// --- reopening a server draft ---

test('draftSeed: recipients, body and file attachments — inline images stay out', () => {
	const filePart = {
		blobId: 'blob-1',
		name: 'report.pdf',
		type: 'application/pdf',
		size: 1024,
		disposition: 'attachment'
	};
	const inlinePart = {
		blobId: 'blob-2',
		name: 'inline.png',
		type: 'image/png',
		size: 2048,
		cid: 'blob-2',
		disposition: 'inline'
	};
	const seed = draftSeed(detail({ id: 'm-draft-7', attachments: [filePart, inlinePart] }));
	assert.equal(seed.jmapDraftId, 'm-draft-7');
	assert.deepEqual(seed.to, [{ name: 'Ada', email: 'ada@example.com', meta: '' }]);
	assert.equal(seed.cc, 'cara@z.com, bob@y.com');
	assert.equal(seed.bcc, 'hidden@z.com');
	assert.equal(seed.subject, 'Hello');
	assert.equal(seed.body, 'Half-written body');
	assert.deepEqual(
		seed.attachments.map((attachment) => [attachment.blobId, attachment.status]),
		[['blob-1', 'ready']]
	);
	assert.equal(attachmentFromServer(filePart).name, 'report.pdf');
});
