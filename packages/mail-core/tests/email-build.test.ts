import assert from 'node:assert/strict';
import { test } from 'node:test';
import { answerHeaders, buildEmailCreateData } from '../src/jmap/email-build.ts';
import { mapEmailDetail } from '../src/jmap/map.ts';

const base = {
	fromEmail: 'me@zaur.app',
	to: ['ada@example.com'],
	subject: 'Re: Plans',
	bodyText: 'Yes.',
	mailboxIds: { sent: true }
};

test('a reply is created with In-Reply-To and References; a new message with neither', () => {
	const reply = buildEmailCreateData({
		...base,
		...answerHeaders({ emailId: 'e1', messageId: 'b@host', references: ['a@host', 'b@host'] })
	});
	assert.deepEqual(reply.inReplyTo, ['b@host']);
	assert.deepEqual(reply.references, ['a@host', 'b@host']);

	const fresh = buildEmailCreateData(base);
	assert.equal('inReplyTo' in fresh, false);
	assert.equal('references' in fresh, false);
});

test('answerHeaders: a first reply references the message alone; a forward threads nowhere', () => {
	assert.deepEqual(answerHeaders({ messageId: 'a@host' }), { inReplyTo: ['a@host'], references: ['a@host'] });
	assert.deepEqual(answerHeaders({ messageId: 'a@host', forward: true, emailId: 'e1' }), {});
	assert.deepEqual(answerHeaders(undefined), {});
});

test('mapEmailDetail: Reply-To and the threading headers reach the reader', () => {
	const detail = mapEmailDetail(
		{
			id: 'e1',
			threadId: 't1',
			receivedAt: '2026-09-10T09:30:00Z',
			from: [{ name: 'Shop Robot', email: 'noreply@shop.example' }],
			replyTo: [{ email: 'support@shop.example' }],
			messageId: ['c@host'],
			inReplyTo: ['b@host'],
			references: ['a@host', 'b@host']
		},
		'inbox'
	);
	assert.deepEqual(detail.replyTo, [{ name: 'support@shop.example', email: 'support@shop.example' }]);
	assert.equal(detail.messageId, 'c@host');
	assert.deepEqual(detail.inReplyTo, ['b@host']);
	assert.deepEqual(detail.references, ['a@host', 'b@host']);

	const plain = mapEmailDetail({ id: 'e2', threadId: 't2', receivedAt: '2026-09-10T09:30:00Z', replyTo: null, messageId: null }, 'inbox');
	assert.equal('replyTo' in plain, false);
	assert.equal('messageId' in plain, false);
});
