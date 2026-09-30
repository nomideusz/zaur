import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listThreadSenderLabel } from '../src/mail/thread-list-utils.ts';
import type { MessagePreview } from '../src/types/mail.ts';

const me = { name: 'Smoke Tester', email: 'smoke@zaur.app' };
const isMe = (email: string) => email === me.email;
const sent = (fields: Partial<MessagePreview>): MessagePreview[] => [
	{ id: 'm', threadId: 't', mailboxId: 'sent', from: me, subject: 's', preview: '', receivedAt: '2026-09-30T08:00:00Z', unread: false, starred: false, important: false, hasAttachment: false, ...fields }
];

test('a sent row names who it went to, under the header that names them', () => {
	const ada = { name: 'Ada', email: 'ada@example.com' };
	const hidden = { name: 'Hidden Person', email: 'hidden@example.com' };
	assert.equal(listThreadSenderLabel(sent({ to: [ada], bcc: [hidden] }), 'sent', isMe, false).label, 'To Ada');
	assert.equal(listThreadSenderLabel(sent({ to: [], cc: [ada] }), 'sent', isMe, false).label, 'To Ada');
	assert.deepEqual(listThreadSenderLabel(sent({ to: [], bcc: [hidden] }), 'sent', isMe, false), { label: 'Bcc Hidden Person', email: hidden.email });
	assert.equal(listThreadSenderLabel(sent({ to: [] }), 'drafts', isMe, false).label, 'No recipients');
	// Received mail is still labelled by its sender.
	assert.equal(listThreadSenderLabel(sent({ from: ada, to: [me] }), 'archive', isMe, false).label, 'Ada');
});
