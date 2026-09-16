import { test } from 'node:test';
import assert from 'node:assert/strict';

import { anyChanged, changedTypes } from '../src/lib/mail/live.ts';
import type { StateChange } from '@zaur/mail-core';

const change = (changed: StateChange['changed']): StateChange => ({
	'@type': 'StateChange',
	changed
});

const none = { email: false, mailbox: false, contact: false, calendar: false };

test('changedTypes: an Email change also refreshes the folder list', () => {
	// Unread counts live on Mailbox but move when Email does, and Stalwart is
	// not obliged to bump both states.
	assert.deepEqual(changedTypes(change({ acc: { Email: 'e1' } })), {
		...none,
		email: true,
		mailbox: true
	});
});

test('changedTypes: a Mailbox-only change leaves the thread list alone', () => {
	assert.deepEqual(changedTypes(change({ acc: { Mailbox: 'm1' } })), { ...none, mailbox: true });
});

test('changedTypes: contacts and calendars are their own flags', () => {
	assert.deepEqual(changedTypes(change({ acc: { ContactCard: 'c1' } })), { ...none, contact: true });
	assert.deepEqual(changedTypes(change({ acc: { AddressBook: 'a1' } })), { ...none, contact: true });
	assert.deepEqual(changedTypes(change({ acc: { CalendarEvent: 'c1' } })), { ...none, calendar: true });
	assert.deepEqual(changedTypes(change({ acc: { Calendar: 'c1' } })), { ...none, calendar: true });
});

test('changedTypes: types this shell does not show are not a refresh', () => {
	assert.deepEqual(changedTypes(change({ acc: { EmailSubmission: 's1', Identity: 'i1' } })), none);
	assert.equal(anyChanged(changedTypes(change({ acc: { Identity: 'i1' } }))), false);
});

test('changedTypes: any account in the payload counts', () => {
	// The shell shows one account; a shared calendar or address book lives in
	// another account and still belongs to what is on screen.
	assert.deepEqual(changedTypes(change({ a: { Mailbox: 'm1' }, b: { Email: 'e1' } })), {
		...none,
		email: true,
		mailbox: true
	});
	assert.equal(changedTypes(change({ shared: { CalendarEvent: 'x' } })).calendar, true);
});

test('changedTypes: anything that is not a StateChange is nothing', () => {
	assert.deepEqual(changedTypes(null), none);
	assert.deepEqual(changedTypes(undefined), none);
	assert.deepEqual(changedTypes({ '@type': 'Ping' } as unknown as StateChange), none);
	assert.deepEqual(changedTypes({ '@type': 'StateChange' } as StateChange), none);
});
