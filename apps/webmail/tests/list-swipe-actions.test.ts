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
	replied: false,
	...overrides
});

describe('list-swipe-actions', () => {
	it('uses restore actions on trash, junk, and archive folders', () => {
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message(),
				mailbox: { role: 'trash' },
				hasInbox: true
			}).map((action) => action.id),
			['move-inbox']
		);
		assert.equal(
			listSwipeLeadingActions({
				message: message(),
				mailbox: { role: 'junk' },
				hasInbox: true
			})[0]?.label,
			'Not spam'
		);
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message(),
				mailbox: { role: 'archive' },
				hasInbox: true
			}).map((action) => action.id),
			['move-inbox']
		);
	});

	it('restore actions dismiss the row', () => {
		const [restore] = listSwipeLeadingActions({
			message: message(),
			mailbox: { role: 'trash' },
			hasInbox: true
		});
		assert.equal(restore?.dismiss, true);
	});

	it('offers exactly one leading action: the Seen/Unsee toggle', () => {
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message({ unread: true }),
				mailbox: { role: 'inbox' },
				hasInbox: true
			}).map((action) => action.id),
			['mark-seen']
		);
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message({ unread: false }),
				mailbox: { role: 'inbox' },
				hasInbox: true
			}).map((action) => action.id),
			['unsee']
		);
	});

	it('offers exactly one trailing action: Trash', () => {
		assert.deepEqual(
			listSwipeTrailingActions({
				message: message(),
				mailbox: { role: 'inbox' },
				hasInbox: true
			}).map((action) => action.id),
			['trash']
		);
	});

	it('uses permanent delete in trash and drafts', () => {
		assert.deepEqual(
			listSwipeTrailingActions({
				message: message(),
				mailbox: { role: 'trash' },
				hasInbox: true
			}).map((action) => action.id),
			['delete-forever']
		);
		assert.deepEqual(
			listSwipeTrailingActions({
				message: message(),
				mailbox: { role: 'drafts' },
				hasInbox: true
			}).map((action) => action.id),
			['delete-draft']
		);
	});

	it('offers no positive swipe in drafts', () => {
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message(),
				mailbox: { role: 'drafts' },
				hasInbox: true
			}),
			[]
		);
	});
});
