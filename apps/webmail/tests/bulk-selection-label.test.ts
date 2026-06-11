import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	bulkAffectedLabel,
	bulkSelectionCounts,
	bulkSelectionReadCount,
	bulkSelectionSummary
} from '../src/lib/components/mail/bulk-selection-label.ts';
import type { MessagePreview } from '../src/lib/types/mail.ts';

function preview(
	partial: Partial<MessagePreview> & Pick<MessagePreview, 'id' | 'threadId'>
): MessagePreview {
	return {
		mailboxId: 'inbox',
		from: { name: 'Alice', email: 'alice@example.com' },
		subject: 'Hello',
		preview: '',
		receivedAt: '2026-06-01T12:00:00Z',
		unread: true,
		starred: false,
		important: false,
		hasAttachment: false,
		replied: false,
		...partial
	};
}

describe('bulkSelectionSummary', () => {
	it('uses mutually exclusive inbox buckets that sum to the selection', () => {
		const messages = [
			preview({ id: 'a', threadId: 't1' }),
			preview({ id: 'b', threadId: 't2', unread: false, important: true }),
			preview({ id: 'c', threadId: 't3', unread: false })
		];

		const counts = bulkSelectionCounts(messages, ['a', 'b', 'c']);
		assert.deepEqual(counts, {
			new: 1,
			important: 1,
			normal: 1,
			notImportant: 2
		});
		assert.equal(counts.new + counts.important + counts.normal, 3);
		assert.deepEqual(bulkSelectionSummary(3, counts), {
			headline: '3 selected',
			detail: '1 unseen · 1 important · 1 normal'
		});
	});

	it('treats unread important as new, not pinned important', () => {
		const messages = [
			preview({ id: 'a', threadId: 't1', important: true }),
			preview({ id: 'b', threadId: 't2', unread: false, important: true }),
			preview({ id: 'c', threadId: 't3', unread: false })
		];

		const counts = bulkSelectionCounts(messages, ['a', 'b', 'c']);
		assert.deepEqual(counts, {
			new: 1,
			important: 1,
			normal: 1,
			notImportant: 1
		});
		assert.deepEqual(bulkSelectionSummary(3, counts), {
			headline: '3 selected',
			detail: '1 unseen · 1 important · 1 normal'
		});
	});

	it('uses a single-state headline when the selection is homogeneous', () => {
		assert.deepEqual(bulkSelectionSummary(4, { new: 4, normal: 0, important: 0, notImportant: 4 }), {
			headline: '4 unseen',
			detail: null
		});
		assert.deepEqual(
			bulkSelectionSummary(2, { new: 0, normal: 0, important: 2, notImportant: 0 }),
			{
				headline: '2 important',
				detail: null
			}
		);
	});

	it('surfaces unresolved selections separately', () => {
		assert.deepEqual(
			bulkSelectionSummary(9, { new: 1, important: 2, normal: 4, notImportant: 7 }, 2),
			{
				headline: '9 selected',
				detail: '1 unseen · 2 important · 4 normal · 2 unavailable'
			}
		);
	});

	it('labels partial bulk actions with affected counts', () => {
		assert.equal(bulkAffectedLabel('Not highlighted', 2, 3), 'Not highlighted (2)');
		assert.equal(bulkAffectedLabel('Not highlighted', 3, 3), 'Not highlighted');
		assert.equal(bulkSelectionReadCount({ new: 1, important: 1, normal: 1, notImportant: 2 }), 2);
	});
});
