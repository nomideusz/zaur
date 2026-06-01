import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	readerPrimaryContact,
	readerSenderLabel,
	shouldShowContactEmail
} from '../src/lib/mail/reader-contact.ts';
import type { MessageDetail } from '../src/lib/types/mail.ts';

function message(overrides: Partial<MessageDetail> = {}): MessageDetail {
	return {
		id: 'msg-1',
		threadId: 'thread-1',
		mailboxId: 'inbox',
		subject: 'Hello',
		from: { name: '', email: 'sender@example.com' },
		to: [],
		cc: [],
		bcc: [],
		receivedAt: '2026-01-01T00:00:00.000Z',
		bodyText: '',
		bodyHtml: '',
		preview: '',
		attachments: [],
		unread: false,
		important: false,
		starred: false,
		hasAttachment: false,
		...overrides
	};
}

describe('shouldShowContactEmail', () => {
	it('hides email when display name is the address', () => {
		assert.equal(shouldShowContactEmail('sender@example.com', 'sender@example.com'), false);
	});

	it('hides email for sent-folder To labels with email-only recipients', () => {
		assert.equal(shouldShowContactEmail('To recipient@example.com', 'recipient@example.com'), false);
		assert.equal(shouldShowContactEmail('To: recipient@example.com', 'recipient@example.com'), false);
	});

	it('shows email when display name is a real name', () => {
		assert.equal(shouldShowContactEmail('Jane Doe', 'jane@example.com'), true);
		assert.equal(shouldShowContactEmail('To Jane Doe', 'jane@example.com'), true);
	});
});

describe('readerSenderLabel', () => {
	const isMe = (email: string) => email === 'me@example.com';

	it('returns the address when the sender has no display name', () => {
		assert.equal(
			readerSenderLabel(message({ from: { name: '', email: 'solo@example.com' } }), 'inbox', isMe),
			'solo@example.com'
		);
	});

	it('returns To recipient in sent mail', () => {
		assert.equal(
			readerSenderLabel(
				message({
					from: { name: '', email: 'me@example.com' },
					to: [{ email: 'friend@example.com', name: 'Friend' }]
				}),
				'sent',
				isMe
			),
			'To Friend'
		);
	});
});

describe('readerPrimaryContact', () => {
	const isMe = (email: string) => email === 'me@example.com';

	it('does not duplicate email-only sent recipients', () => {
		const contact = readerPrimaryContact(
			message({
				from: { name: '', email: 'me@example.com' },
				to: [{ name: '', email: 'friend@example.com' }]
			}),
			'sent',
			isMe
		);
		assert.equal(contact.displayName, 'To friend@example.com');
		assert.equal(shouldShowContactEmail(contact.displayName, contact.email), false);
	});
});
