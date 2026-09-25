import { test } from 'node:test';
import assert from 'node:assert/strict';

import { describeRepeat, eventsOnDay, shiftMonth } from '../src/lib/calendar/schedule.ts';
import { pickPrincipal } from '../src/lib/share.ts';
import type { EventRecurrence } from '@zaur/mail-core';

const day = new Date(2026, 8, 19); // Saturday 19 September 2026

function at(hour: number, minute = 0, on = day): Date {
	return new Date(on.getFullYear(), on.getMonth(), on.getDate(), hour, minute);
}

function event(startHour: number, endHour: number, allDay = false) {
	return { start: at(startHour), end: at(endHour), allDay };
}

test('a day holds what touches it, all-day first', () => {
	const banner = { start: at(0), end: at(24), allDay: true };
	const morning = event(9, 10);
	const elsewhere = event(9, 10, false);
	elsewhere.start = at(9, 0, new Date(2026, 8, 20));
	elsewhere.end = at(10, 0, new Date(2026, 8, 20));

	const found = eventsOnDay([morning, banner, elsewhere], day);
	assert.deepEqual(found, [banner, morning]);
	// Touching the edge is not overlapping it: midnight belongs to the next day.
	assert.equal(eventsOnDay([{ start: at(24), end: at(25), allDay: false }], day).length, 0);
});

test('a repeat rule says what it does, and lists dates only when they are certain', () => {
	const every = (over: Partial<EventRecurrence> = {}): EventRecurrence => ({
		frequency: 'daily',
		interval: 1,
		byDay: [],
		...over
	});

	assert.equal(describeRepeat(null, day), null);
	assert.match(describeRepeat(every(), day)!, /^Every day · then /);
	// A weekly rule with no days named falls back to the start's own weekday.
	assert.match(describeRepeat(every({ frequency: 'weekly' }), day)!, /^Every week on Saturday · then /);
	// The 19th exists in every month, so the dates are safe to show.
	assert.match(describeRepeat(every({ frequency: 'monthly' }), day)!, /^Every month on the 19th · then /);
	// The 31st does not: state the rule, promise no dates.
	assert.equal(
		describeRepeat(every({ frequency: 'monthly' }), new Date(2026, 0, 31)),
		'Every month on the 31st'
	);
	const leap = describeRepeat(every({ frequency: 'yearly' }), new Date(2028, 1, 29))!;
	assert.doesNotMatch(leap, / · then /);
});

test('an interval reads as English, not as a number', () => {
	const rule = (interval: number): EventRecurrence => ({ frequency: 'weekly', interval, byDay: ['mo'] });
	assert.match(describeRepeat(rule(1), day)!, /^Every week on Mon/);
	assert.match(describeRepeat(rule(2), day)!, /^Every other week on Mon/);
	assert.match(describeRepeat(rule(3), day)!, /^Every 3rd week on Mon/);
});

test('a weekly rule on several days lists the days, and the dates it really lands on', () => {
	// Saturday 19 September 2026. Every other week on Mon and Wed.
	const fortnightly: EventRecurrence = { frequency: 'weekly', interval: 2, byDay: ['mo', 'we'] };
	const line = describeRepeat(fortnightly, day)!;
	assert.match(line, /^Every other week on Mon and Wed · then /);
	// The 19th is in the start week, so the next hits are the week after next:
	// Mon 28 Sep and Wed 30 Sep — not 21/23, which are one week out.
	assert.match(line, /then \D*28\D+Sep\D*, \D*30\D+Sep\D*$|then Sep 28, Sep 30$/);

	const weekly: EventRecurrence = { frequency: 'weekly', interval: 1, byDay: ['mo', 'we'] };
	assert.match(describeRepeat(weekly, day)!, /then \D*21\D+Sep\D*, \D*23\D+Sep\D*$|then Sep 21, Sep 23$/);
});

test('an end is part of what the rule says', () => {
	const base: EventRecurrence = { frequency: 'weekly', interval: 1, byDay: ['sa'] };
	assert.match(describeRepeat({ ...base, count: 5 }, day)!, /, 5 times/);
	assert.match(describeRepeat({ ...base, count: 1 }, day)!, /, once/);
	assert.match(describeRepeat({ ...base, until: '2026-12-31T23:59:59' }, day)!, / until .*December/);
});

test('paging by month lands on the same day, and never skips a short one', () => {
	assert.deepEqual(shiftMonth(new Date(2026, 8, 19), 1), new Date(2026, 9, 19));
	assert.deepEqual(shiftMonth(new Date(2026, 8, 19), -1), new Date(2026, 7, 19));
	// 31 January + 1 month is 28 February, not 3 March.
	assert.deepEqual(shiftMonth(new Date(2026, 0, 31), 1), new Date(2026, 1, 28));
	assert.deepEqual(shiftMonth(new Date(2028, 0, 31), 1), new Date(2028, 1, 29));
	// Across a year boundary, in both directions.
	assert.deepEqual(shiftMonth(new Date(2026, 11, 15), 1), new Date(2027, 0, 15));
	assert.deepEqual(shiftMonth(new Date(2026, 0, 15), -1), new Date(2025, 11, 15));
});

test('sharing picks the person typed, never you and never a guess', () => {
	const self = { id: 'p0', name: 'Me', email: 'me@zaur.app' };
	const bob = { id: 'p1', name: 'Bob', email: 'bob@zaur.app' };
	const bobby = { id: 'p2', name: 'Bobby', email: 'bobby@zaur.app' };

	assert.deepEqual(pickPrincipal([bob, bobby], 'BOB@zaur.app ', 'p0'), { person: bob });
	// A name search that found one other person is that person.
	assert.deepEqual(pickPrincipal([self, bobby], 'bobby', 'p0'), { person: bobby });
	assert.match((pickPrincipal([bob, bobby], 'bob', 'p0') as { error: string }).error, /Several/);
	assert.match((pickPrincipal([self], 'me@zaur.app', 'p0') as { error: string }).error, /yours/);
	assert.match((pickPrincipal([], 'x@zaur.app', 'p0') as { error: string }).error, /Nobody/);
});
