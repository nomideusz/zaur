import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	INBOX_MAILBOX_ROUTE_ID,
	isMailPath,
	mailListHref,
	parseMailContext
} from '../src/lib/mail/routes.ts';

describe('mail routes', () => {
	it('maps inbox list to root', () => {
		assert.equal(mailListHref(INBOX_MAILBOX_ROUTE_ID), '/');
		assert.equal(mailListHref('sent'), '/mail/sent');
	});

	it('parses inbox home from root path', () => {
		assert.deepEqual(parseMailContext('/'), {
			kind: 'mailbox',
			mailboxRouteId: INBOX_MAILBOX_ROUTE_ID,
			threadId: null
		});
	});

	it('treats root as a mail path', () => {
		assert.equal(isMailPath('/'), true);
		assert.equal(isMailPath('/mail/sent'), true);
		assert.equal(isMailPath('/settings/account'), false);
	});
});
