import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	readerDeliveredTo,
	userOwnedAddresses
} from '../src/lib/mail/reader-delivered-to.ts';
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
		replied: false,
		...overrides
	};
}

describe('userOwnedAddresses', () => {
	it('collects username and identity emails', () => {
		const owned = userOwnedAddresses('Me@Example.com', [
			{ email: 'alias@example.com' },
			{ email: '' }
		]);
		assert.equal(owned.size, 2);
		assert.ok(owned.has('me@example.com'));
		assert.ok(owned.has('alias@example.com'));
	});
});

describe('readerDeliveredTo', () => {
	const owned = userOwnedAddresses('me@example.com', [{ email: 'alias@example.com' }]);

	it('returns To line for inbound mail delivered to owned addresses', () => {
		assert.deepEqual(
			readerDeliveredTo(
				message({
					to: [{ name: '', email: 'alias@example.com' }],
					cc: [{ name: '', email: 'me@example.com' }]
				}),
				owned
			),
			{ prefix: 'To', addresses: 'alias@example.com, me@example.com' }
		);
	});

	it('returns From line for sent mail from an owned address', () => {
		assert.deepEqual(
			readerDeliveredTo(
				message({
					from: { name: '', email: 'alias@example.com' },
					to: [{ name: '', email: 'friend@example.com' }]
				}),
				owned
			),
			{ prefix: 'From', addresses: 'alias@example.com' }
		);
	});

	it('returns null when no owned or local catch-all address matches', () => {
		assert.equal(
			readerDeliveredTo(
				message({
					to: [{ name: '', email: 'friend@other.com' }]
				}),
				owned
			),
			null
		);
	});

	it('returns To line for catch-all mail addressed to an unknown local address', () => {
		assert.deepEqual(
			readerDeliveredTo(
				message({
					to: [{ name: '', email: 'sales@example.com' }]
				}),
				owned
			),
			{ prefix: 'To', addresses: 'sales@example.com' }
		);
	});

	it('shows catch-all local addresses before owned addresses', () => {
		assert.deepEqual(
			readerDeliveredTo(
				message({
					to: [
						{ name: '', email: 'sales@example.com' },
						{ name: '', email: 'me@example.com' }
					]
				}),
				owned
			),
			{ prefix: 'To', addresses: 'sales@example.com, me@example.com' }
		);
	});

	it('collects multiple unknown local addresses', () => {
		assert.deepEqual(
			readerDeliveredTo(
				message({
					to: [{ name: '', email: 'sales@example.com' }],
					cc: [{ name: '', email: 'support@example.com' }]
				}),
				owned
			),
			{ prefix: 'To', addresses: 'sales@example.com, support@example.com' }
		);
	});
});
