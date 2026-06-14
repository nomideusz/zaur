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

const baseCtx = {
	canMarkImportant: true,
	canMarkSpam: true,
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

	it('restore actions dismiss the row', () => {
		const [restore] = listSwipeLeadingActions({
			message: message(),
			mailbox: { role: 'trash' },
			...baseCtx
		});
		assert.equal(restore?.dismiss, true);
	});

	it('offers the highlight toggle first, then the seen toggle', () => {
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message({ unread: true }),
				mailbox: { role: 'inbox' },
				...baseCtx
			}).map((action) => action.id),
			['mark-important', 'mark-seen']
		);
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message({ unread: false, important: true }),
				mailbox: { role: 'inbox' },
				...baseCtx
			}).map((action) => action.id),
			['remove-important', 'unsee']
		);
	});

	it('drops the highlight tier where marking important is not allowed', () => {
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message({ unread: true }),
				mailbox: { role: 'sent' },
				...baseCtx,
				canMarkImportant: false
			}).map((action) => action.id),
			['mark-seen']
		);
	});

	it('offers trash (tier 1) then spam (tier 2) where spam applies', () => {
		assert.deepEqual(
			listSwipeTrailingActions({
				message: message(),
				mailbox: { role: 'inbox' },
				...baseCtx
			}).map((action) => action.id),
			['trash', 'spam']
		);
		assert.deepEqual(
			listSwipeTrailingActions({
				message: message(),
				mailbox: { role: 'sent' },
				...baseCtx,
				canMarkSpam: false
			}).map((action) => action.id),
			['trash']
		);
	});

	it('uses permanent delete in trash and drafts', () => {
		assert.deepEqual(
			listSwipeTrailingActions({
				message: message(),
				mailbox: { role: 'trash' },
				...baseCtx,
				canMarkSpam: false
			}).map((action) => action.id),
			['delete-forever']
		);
		assert.deepEqual(
			listSwipeTrailingActions({
				message: message(),
				mailbox: { role: 'drafts' },
				...baseCtx,
				canMarkSpam: false
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
