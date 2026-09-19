import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	describeRepeat,
	eventsOnDay,
	percentOfDay,
	placeDay,
	shiftMonth
} from '../src/lib/calendar/schedule.ts';

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

test('overlapping events share the width, unrelated ones keep it', () => {
	const nine = event(9, 11);
	const ten = event(10, 12);
	const afternoon = event(14, 15);
	const placed = placeDay([nine, ten, afternoon], day);

	assert.deepEqual(
		placed.map((item) => [item.lane, item.lanes]),
		[
			[0, 2],
			[1, 2],
			[0, 1]
		]
	);
	// 09:00–11:00 of a 24h day: an twelfth of it, starting three eighths in.
	assert.equal(placed[0].top, (9 / 24) * 100);
	assert.equal(placed[0].height, (2 / 24) * 100);
});

test('a lane is reused once it is free', () => {
	// 09–10 and 10–11 do not overlap, but both overlap 09–12: three events, two lanes.
	const placed = placeDay([event(9, 12), event(9, 10), event(10, 11)], day);
	assert.deepEqual(
		placed.map((item) => item.lane),
		[0, 1, 1]
	);
	assert.deepEqual(new Set(placed.map((item) => item.lanes)), new Set([2]));
});

test('an event running over midnight is clipped to the day and says so', () => {
	const overnight = {
		start: new Date(2026, 8, 18, 22, 0),
		end: new Date(2026, 8, 19, 2, 0),
		allDay: false
	};
	const [placed] = placeDay([overnight], day);
	assert.equal(placed.top, 0);
	assert.equal(placed.height, (2 / 24) * 100);
	assert.equal(placed.continuesBefore, true);
	assert.equal(placed.continuesAfter, false);
});

test('the now line is a percentage of its own day', () => {
	assert.equal(percentOfDay(at(6)), 25);
	assert.equal(percentOfDay(at(0)), 0);
});

test('a repeat rule says what it does, and lists dates only when they are certain', () => {
	assert.equal(describeRepeat('none', day), null);
	assert.match(describeRepeat('daily', day)!, /^Every day · then /);
	assert.match(describeRepeat('weekly', day)!, /^Every Saturday · then /);
	// The 19th exists in every month, so the dates are safe to show.
	assert.match(describeRepeat('monthly', day)!, /^Every month on the 19th · then /);
	// The 31st does not: state the rule, promise no dates.
	assert.equal(describeRepeat('monthly', new Date(2026, 0, 31)), 'Every month on the 31st');
	// Leap day, likewise. (Month and day order follow the locale.)
	const leap = describeRepeat('yearly', new Date(2028, 1, 29))!;
	assert.match(leap, /^Every .*(February|29)/);
	assert.doesNotMatch(leap, / · then /);
	assert.match(describeRepeat('yearly', day)!, /^Every .*September.* · then /);
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
