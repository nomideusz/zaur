import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	collapseMessagesByThread,
	listThreadSenderLabel
} from '../src/lib/components/mail/thread-list-utils.ts';
import {
	bulkSelectionCounts,
	bulkSelectionLabel,
	bulkSelectionPrimaryAction
} from '../src/lib/components/mail/bulk-selection-label.ts';
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

describe('bulkSelectionLabel', () => {
	it('describes marking not-important messages', () => {
		const messages = [
			preview({ id: 'a', threadId: 't1' }),
			preview({ id: 'b', threadId: 't2', important: true })
		];

		assert.deepEqual(bulkSelectionCounts(messages, ['a', 'b']), {
			notImportant: 1,
			important: 1
		});
		assert.equal(
			bulkSelectionLabel({
				selectedCount: 2,
				notImportantCount: 1,
				importantCount: 1,
				canMarkImportant: true
			}),
			'Mark 1 important'
		);
	});

	it('describes removing important messages when none can be marked', () => {
		assert.equal(
			bulkSelectionLabel({
				selectedCount: 4,
				notImportantCount: 0,
				importantCount: 4,
				canMarkImportant: true
			}),
			'Remove 4 important'
		);
		assert.equal(
			bulkSelectionPrimaryAction({
				notImportantCount: 0,
				importantCount: 4,
				canMarkImportant: true
			}),
			'remove-important'
		);
	});
});
