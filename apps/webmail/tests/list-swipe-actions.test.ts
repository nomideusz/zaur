import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	listSwipeActionForTier,
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
	canArchive: true,
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

	it('offers Seen short then Archive deep when archive is available', () => {
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message({ unread: true }),
				mailbox: { role: 'inbox' },
				...baseCtx
			}).map((action) => [action.id, action.tier]),
			[
				['mark-seen', 1],
				['archive', 2]
			]
		);
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message({ unread: false }),
				mailbox: { role: 'inbox' },
				...baseCtx
			}).map((action) => action.id),
			['unsee', 'archive']
		);
	});

	it('falls back to Highlight deep when archive is unavailable', () => {
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message({ unread: true }),
				mailbox: { role: 'inbox' },
				...baseCtx,
				canArchive: false
			}).map((action) => action.id),
			['mark-seen', 'mark-important']
		);
	});

	it('drops the deep tier where neither archive nor highlight apply', () => {
		assert.deepEqual(
			listSwipeLeadingActions({
				message: message({ unread: true }),
				mailbox: { role: 'sent' },
				...baseCtx,
				canMarkImportant: false,
				canArchive: false
			}).map((action) => action.id),
			['mark-seen']
		);
	});

	it('offers trash (short) then spam (deep) where spam applies', () => {
		assert.deepEqual(
			listSwipeTrailingActions({
				message: message(),
				mailbox: { role: 'inbox' },
				...baseCtx
			}).map((action) => [action.id, action.tier]),
			[
				['trash', 1],
				['spam', 2]
			]
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

	it('picks the action for an armed tier', () => {
		const actions = listSwipeLeadingActions({
			message: message({ unread: true }),
			mailbox: { role: 'inbox' },
			...baseCtx
		});
		assert.equal(listSwipeActionForTier(actions, 1)?.id, 'mark-seen');
		assert.equal(listSwipeActionForTier(actions, 2)?.id, 'archive');
		assert.equal(listSwipeActionForTier([], 1), null);
	});
});
