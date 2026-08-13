import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	calendarAllowsWrites,
	calendarDeleteBlockedReason,
	eventIsVisibleOnCalendars,
	isOwnedCalendar,
	nextCalendarColor,
	normalizeCalendarRights,
	patchShareWith,
	rightsForShareRole,
	shareRoleFromRights
} from '../src/jmap/calendar-rights.ts';
import { JmapMethodError, isJmapMethodError } from '../src/jmap/errors.ts';
import type { Calendar } from '../src/types/calendar.ts';

function calendar(partial: Partial<Calendar> & Pick<Calendar, 'id' | 'name'>): Calendar {
	return {
		color: '#2563eb',
		isDefault: false,
		isVisible: true,
		isSubscribed: true,
		myRights: normalizeCalendarRights(null),
		shareWith: null,
		...partial
	};
}

test('missing myRights is treated as full owner access', () => {
	const rights = normalizeCalendarRights(null);
	assert.equal(rights.mayShare, true);
	assert.equal(rights.mayDelete, true);
	assert.equal(rights.mayWriteAll, true);
});

test('partial myRights does not grant owner actions', () => {
	const rights = normalizeCalendarRights({ mayReadItems: true, mayReadFreeBusy: true });
	assert.equal(rights.mayWriteAll, false);
	assert.equal(rights.mayShare, false);
	assert.equal(calendarAllowsWrites({ myRights: rights }), false);
	assert.equal(isOwnedCalendar({ isDefault: false, myRights: rights }), false);
});

test('owned calendars are writable and can be shared', () => {
	const owned = calendar({ id: 'mine', name: 'Work', isDefault: true });
	assert.equal(isOwnedCalendar(owned), true);
	assert.equal(calendarAllowsWrites(owned), true);
});

test('cannot delete the default or last calendar', () => {
	const only = calendar({ id: 'a', name: 'Default', isDefault: true });
	assert.equal(
		calendarDeleteBlockedReason(only, [only]),
		'Set another calendar as default before deleting this one.'
	);

	const extra = calendar({ id: 'b', name: 'Extra', isDefault: true });
	assert.equal(
		calendarDeleteBlockedReason(extra, [only, extra]),
		'Set another calendar as default before deleting this one.'
	);

	const personal = calendar({ id: 'c', name: 'Personal' });
	assert.equal(calendarDeleteBlockedReason(personal, [only, personal]), null);
	assert.equal(calendarDeleteBlockedReason(personal, [personal]), 'Keep at least one calendar.');
});

test('events stay visible when any of their calendars is shown', () => {
	const hidden = new Set(['a']);
	assert.equal(eventIsVisibleOnCalendars(['a', 'b'], hidden), true);
	assert.equal(eventIsVisibleOnCalendars(['a'], hidden), false);
	assert.equal(eventIsVisibleOnCalendars(['b'], hidden), true);
	assert.equal(eventIsVisibleOnCalendars([], hidden), true);
});

test('next calendar color skips colors already in use', () => {
	assert.equal(nextCalendarColor(['#2563eb', '#7c3aed']), '#db2777');
	assert.equal(nextCalendarColor(['#2563EB']), '#7c3aed');
});

test('shareWith patches add, update, and remove principals', () => {
	const read = rightsForShareRole('read');
	const write = rightsForShareRole('write');
	assert.equal(shareRoleFromRights(read), 'read');
	assert.equal(shareRoleFromRights(write), 'write');

	const added = patchShareWith(null, 'p1', read);
	assert.deepEqual(added.p1, read);

	const updated = patchShareWith({ p1: read }, 'p1', write);
	assert.deepEqual(updated.p1, write);

	const removed = patchShareWith({ p1: write }, 'p1', null);
	assert.equal(removed.p1, null);
});

test('JmapMethodError matches calendarHasEvent', () => {
	const error = new JmapMethodError('calendarHasEvent', 'Calendar has events');
	assert.equal(isJmapMethodError(error, 'calendarHasEvent'), true);
	assert.equal(isJmapMethodError(error, 'forbidden'), false);
	assert.equal(isJmapMethodError(new Error('nope'), 'calendarHasEvent'), false);
});
