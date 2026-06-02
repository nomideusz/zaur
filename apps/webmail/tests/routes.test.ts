import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	INBOX_MAILBOX_ROUTE_ID,
	isMailPath,
	mailListBackHref,
	mailListHref,
	mailThreadHref,
	parseMailContext
} from '../src/lib/mail/routes.ts';

describe('mail routes', () => {
	it('maps inbox list to root', () => {
		assert.equal(mailListHref(INBOX_MAILBOX_ROUTE_ID), '/');
		assert.equal(mailListHref('sent'), '/mail/sent');
	});

	it('returns home when backing out of Important threads', () => {
		assert.equal(mailListBackHref('important'), '/');
		assert.equal(mailListBackHref('sent'), '/mail/sent');
	});

	it('builds inbox thread URLs under /mail/inbox', () => {
		assert.equal(
			mailThreadHref(INBOX_MAILBOX_ROUTE_ID, 'thread-abc'),
			'/mail/inbox/thread-abc'
		);
		assert.equal(
			mailThreadHref('sent', 'thread-abc'),
			'/mail/sent/thread-abc'
		);
	});

	it('parses inbox home from root path', () => {
		assert.deepEqual(parseMailContext('/'), {
			kind: 'mailbox',
			mailboxRouteId: INBOX_MAILBOX_ROUTE_ID,
			threadId: null
		});
	});

	it('parses inbox and folder threads', () => {
		assert.deepEqual(parseMailContext('/mail/inbox/thread-1'), {
			kind: 'mailbox',
			mailboxRouteId: INBOX_MAILBOX_ROUTE_ID,
			threadId: 'thread-1'
		});
		assert.deepEqual(parseMailContext('/mail/important/thread-2'), {
			kind: 'mailbox',
			mailboxRouteId: 'important',
			threadId: 'thread-2'
		});
	});

	it('treats root as a mail path', () => {
		assert.equal(isMailPath('/'), true);
		assert.equal(isMailPath('/mail/sent'), true);
		assert.equal(isMailPath('/settings/account'), false);
		assert.equal(isMailPath('/contacts'), false);
		assert.equal(isMailPath('/calendar'), false);
	});
});
