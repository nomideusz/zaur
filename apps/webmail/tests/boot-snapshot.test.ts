import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseBootSnapshot, BOOT_SNAPSHOT_LIST_LIMIT } from '../src/lib/mail/boot-snapshot.ts';
import { firstPageLimit, listHasMoreAfterBatch, FIRST_PAGE_SIZE, PAGE_SIZE } from '../src/lib/mail/list-pagination.ts';
import type { Mailbox, MessagePreview } from '../src/lib/types/mail.ts';

const mailbox: Mailbox = {
	id: 'inbox',
	jmapId: 'mb-inbox',
	name: 'Emails',
	role: 'inbox',
	unread: 2,
	total: 40
};

function preview(id: string): MessagePreview {
	return {
		id,
		threadId: `t-${id}`,
		mailboxId: 'inbox',
		from: { name: 'Ada', email: 'ada@zaur.app' },
		subject: 'Hello',
		preview: 'Hi',
		receivedAt: '2026-08-01T10:00:00Z',
		unread: false,
		starred: false,
		important: false,
		hasAttachment: false,
		replied: false
	};
}

describe('parseBootSnapshot', () => {
	it('accepts a recent snapshot for the expected user', () => {
		const parsed = parseBootSnapshot(
			{
				username: 'Ada@Zaur.app',
				mailboxes: [mailbox],
				lists: { inbox: [preview('1')] },
				savedAt: Date.now()
			},
			'ada@zaur.app'
		);
		assert.ok(parsed);
		assert.equal(parsed?.mailboxes.length, 1);
		assert.equal(parsed?.lists.inbox.length, 1);
	});

	it('rejects a snapshot for a different user', () => {
		assert.equal(
			parseBootSnapshot(
				{
					username: 'ada@zaur.app',
					mailboxes: [mailbox],
					lists: {},
					savedAt: Date.now()
				},
				'other@zaur.app'
			),
			null
		);
	});

	it('rejects an expired snapshot', () => {
		assert.equal(
			parseBootSnapshot(
				{
					username: 'ada@zaur.app',
					mailboxes: [mailbox],
					lists: {},
					savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000
				},
				'ada@zaur.app'
			),
			null
		);
	});
});

describe('list pagination', () => {
	it('keeps the first page small unless a larger cache is already on screen', () => {
		assert.equal(firstPageLimit(0), FIRST_PAGE_SIZE);
		assert.equal(firstPageLimit(FIRST_PAGE_SIZE), FIRST_PAGE_SIZE);
		assert.equal(firstPageLimit(PAGE_SIZE), PAGE_SIZE);
		assert.equal(BOOT_SNAPSHOT_LIST_LIMIT, FIRST_PAGE_SIZE);
	});

	it('does not end the list when the first page is smaller than PAGE_SIZE', () => {
		assert.equal(
			listHasMoreAfterBatch({
				hasMoreFromQuery: true,
				lastBatchSize: FIRST_PAGE_SIZE,
				requestedLimit: FIRST_PAGE_SIZE,
				queryOffset: FIRST_PAGE_SIZE,
				catalogTotal: 80
			}),
			true
		);
		assert.equal(
			listHasMoreAfterBatch({
				hasMoreFromQuery: false,
				lastBatchSize: 12,
				requestedLimit: FIRST_PAGE_SIZE,
				queryOffset: 12,
				catalogTotal: 12
			}),
			false
		);
		assert.equal(
			listHasMoreAfterBatch({
				hasMoreFromQuery: true,
				lastBatchSize: PAGE_SIZE,
				requestedLimit: PAGE_SIZE,
				queryOffset: PAGE_SIZE,
				catalogTotal: 200
			}),
			true
		);
	});
});
