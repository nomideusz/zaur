import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	listSwipeLeadingActions,
	listSwipeTrailingActions
} from '../src/lib/mail/list-swipe-actions.ts';
import type { MessagePreview } from '../src/lib/types/mail.ts';

const message = (overrides: Partial<MessagePreview> = {}): MessagePreview => ({
	id: 'm1',
	threadId: 't1',
	mailboxId: 'inbox',
	from: { name: 'Ada', email: 'ada@example.com' },
	subject: 'Hello',
	preview: 'Hi',
	receivedAt: '2026-01-01T12:00:00.000Z',
	unread: false,
	starred: false,
	important: false,
	hasAttachment: false,
	...overrides
});

const baseCtx = {
	canMarkImportant: true,
	hasInbox: true
};

describe('list-swipe-actions', () => {
	it('uses restore actions on trash, junk, and archive folders', () => {
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message(),
				mailbox: { role: 'trash' },
				...baseCtx
			}).map((action) => action.id),
			['move-inbox']
		);
		assert.equal(
			listSwipeLeadingActions({
				message: message(),
				mailbox: { role: 'junk' },
				...baseCtx
			})[0]?.label,
			'Not spam'
		);
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message(),
				mailbox: { role: 'archive' },
				...baseCtx
			}).map((action) => action.id),
			['move-inbox']
		);
	});

	it('uses important then done for new messages', () => {
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message({ unread: true }),
				mailbox: { role: 'inbox' },
				...baseCtx
			}).map((action) => action.id),
			['mark-important']
		);
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message({ unread: true, important: true }),
				mailbox: { role: 'inbox' },
				canMarkImportant: true,
				hasInbox: true
			}).map((action) => action.id),
			['done']
		);
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message({ unread: true }),
				mailbox: { role: 'sent' },
				canMarkImportant: false,
				hasInbox: true
			}).map((action) => action.id),
			['done']
		);
	});

	it('uses important for normal messages when eligible', () => {
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message(),
				mailbox: { role: 'inbox' },
				...baseCtx
			}).map((action) => action.id),
			['mark-important']
		);
	});

	it('uses destructive trailing actions per folder', () => {
		assert.deepEqual(
			listSwipeTrailingActions({
				message: message(),
				mailbox: { role: 'inbox' },
				...baseCtx
			}).map((action) => action.id),
			['trash']
		);
		assert.deepEqual(
			listSwipeTrailingActions({
				message: message(),
				mailbox: { role: 'trash' },
				...baseCtx
			}).map((action) => action.id),
			['delete-forever']
		);
		assert.deepEqual(
			listSwipeTrailingActions({
				message: message(),
				mailbox: { role: 'drafts' },
				...baseCtx
			}).map((action) => action.id),
			['delete-draft']
		);
	});

	it('offers no positive swipe in drafts', () => {
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message(),
				mailbox: { role: 'drafts' },
				...baseCtx
			}),
			[]
		);
	});
});
