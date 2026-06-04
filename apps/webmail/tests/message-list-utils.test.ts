import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	collapseMessagesByThread,
	listThreadSenderLabel
} from '../src/lib/components/mail/thread-list-utils.ts';
import type { MessagePreview } from '../src/lib/types/mail.ts';

function preview(partial: Partial<MessagePreview> & Pick<MessagePreview, 'id' | 'threadId'>): MessagePreview {
	return {
		mailboxId: 'inbox',
		from: { name: 'Alice', email: 'alice@example.com' },
		subject: 'Hello',
		preview: '',
		receivedAt: '2026-06-01T10:00:00Z',
		unread: true,
		starred: false,
		important: false,
		hasAttachment: false,
		replied: false,
		...partial
	};
}

describe('collapseMessagesByThread', () => {
	it('keeps one row per thread using the latest message', () => {
		const collapsed = collapseMessagesByThread([
			preview({ id: 'a1', threadId: 't1', receivedAt: '2026-06-01T09:00:00Z' }),
			preview({ id: 'a2', threadId: 't1', receivedAt: '2026-06-01T11:00:00Z', unread: false })
		]);

		assert.equal(collapsed.length, 1);
		assert.equal(collapsed[0]?.id, 'a2');
		assert.equal(collapsed[0]?.unread, true);
	});
});

describe('listThreadSenderLabel', () => {
	const isMe = (email: string) => email === 'me@example.com';

	it('shows counterparty when the latest inbox message is mine', () => {
		const label = listThreadSenderLabel(
			[
				preview({
					id: '1',
					threadId: 't1',
					from: { name: 'Alice', email: 'alice@example.com' },
					receivedAt: '2026-06-01T09:00:00Z'
				}),
				preview({
					id: '2',
					threadId: 't1',
					from: { name: 'Me', email: 'me@example.com' },
					to: [{ name: 'Alice', email: 'alice@example.com' }],
					receivedAt: '2026-06-01T11:00:00Z'
				})
			],
			'inbox',
			isMe,
			false
		);

		assert.equal(label, 'Alice');
	});
});
