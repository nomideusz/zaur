import { test } from 'node:test';
import assert from 'node:assert/strict';

import { changedTypes } from '../src/lib/mail/live.ts';
import type { StateChange } from '@zaur/mail-core';

const change = (changed: StateChange['changed']): StateChange => ({
	'@type': 'StateChange',
	changed
});

test('changedTypes: an Email change also refreshes the folder list', () => {
	// Unread counts live on Mailbox but move when Email does, and Stalwart is
	// not obliged to bump both states.
	assert.deepEqual(changedTypes(change({ acc: { Email: 'e1' } })), {
		email: true,
		mailbox: true
	});
});

test('changedTypes: a Mailbox-only change leaves the thread list alone', () => {
	assert.deepEqual(changedTypes(change({ acc: { Mailbox: 'm1' } })), {
		email: false,
		mailbox: true
	});
});

test('changedTypes: types this shell does not show are not a refresh', () => {
	assert.deepEqual(changedTypes(change({ acc: { CalendarEvent: 'c1' } })), {
		email: false,
		mailbox: false
	});
});

test('changedTypes: any account in the payload counts', () => {
	// The shell shows one account; anything it is told about is that one.
	assert.deepEqual(changedTypes(change({ a: { Mailbox: 'm1' }, b: { Email: 'e1' } })), {
		email: true,
		mailbox: true
	});
});

test('changedTypes: anything that is not a StateChange is ignored', () => {
	const quiet = { email: false, mailbox: false };
	assert.deepEqual(changedTypes(null), quiet);
	assert.deepEqual(changedTypes(undefined), quiet);
	assert.deepEqual(changedTypes({ '@type': 'Ping' } as unknown as StateChange), quiet);
	assert.deepEqual(changedTypes({ '@type': 'StateChange' } as StateChange), quiet);
});
