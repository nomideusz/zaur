import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRecurringInstance, mapCalendarEvent } from '@zaur/mail-core';

/**
 * Both shapes below are what Stalwart 0.16.21 actually answers a
 * `CalendarEvent/query` with `expandRecurrences: true` — every row carries a
 * synthetic id and a `baseEventId`, whether or not it repeats. Only the
 * occurrence of a series carries a `recurrenceId`, and that is the difference
 * the mapper has to read: a write against a synthetic id is an instance
 * override, where the server refuses `calendarIds`.
 */
test('mapCalendarEvent: an expanded plain event is the event itself, not an occurrence', () => {
	const event = mapCalendarEvent({
		id: 'eaaaaac',
		baseEventId: 'c',
		title: 'Dentist',
		start: '2026-09-19T09:00:00',
		duration: 'PT1H',
		calendarIds: { c: true }
	});

	assert.equal(event.id, 'c', 'writes have to target the master id');
	assert.equal(event.baseEventId, undefined);
	assert.equal(event.recurrenceId, undefined);
	assert.equal(isRecurringInstance(event), false);
});

test('mapCalendarEvent: one occurrence of a series keeps its synthetic id', () => {
	const event = mapCalendarEvent({
		id: 'iaaaaad',
		baseEventId: 'd',
		recurrenceId: '2026-09-22T09:00:00',
		title: 'Weekly standup',
		start: '2026-09-22T09:00:00',
		duration: 'PT30M',
		calendarIds: { b: true }
	});

	assert.equal(event.id, 'iaaaaad', 'the override is recorded against the instance');
	assert.equal(event.baseEventId, 'd');
	assert.equal(event.recurrenceId, '2026-09-22T09:00:00');
	assert.equal(isRecurringInstance(event), true);
});
