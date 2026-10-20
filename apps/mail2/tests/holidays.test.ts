import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holidayCountry, holidayEvents, yearsIn } from '../src/lib/calendar/holidays.ts';

test('the country comes from the pref, else the language', () => {
	assert.equal(holidayCountry('DE', 'pl-PL'), 'DE');
	assert.equal(holidayCountry('none', 'pl-PL'), null);
	assert.equal(holidayCountry('', 'pl'), 'PL');
	assert.equal(holidayCountry('', 'es-419'), null);
	assert.equal(holidayCountry('', undefined), null);
});

test('a range spanning New Year asks for both years', () => {
	assert.deepEqual(yearsIn(new Date(2026, 11, 28), new Date(2027, 0, 5)), [2026, 2027]);
	assert.deepEqual(yearsIn(new Date(2026, 11, 1), new Date(2027, 0, 1)), [2026]);
});

test('holidays become all-day events inside the range', () => {
	const list = [
		{ date: '2026-11-11', localName: 'Narodowe Święto Niepodległości', name: 'National Independence Day' },
		{ date: '2026-12-25', localName: 'Christmas Day', name: 'Christmas Day' }
	];
	const events = holidayEvents('PL', list, new Date(2026, 10, 1), new Date(2026, 11, 1));
	assert.equal(events.length, 1);
	const [event] = events;
	assert.equal(event!.title, 'Narodowe Święto Niepodległości');
	assert.equal(event!.description, 'National Independence Day');
	assert.equal(event!.allDay, true);
	assert.deepEqual(event!.start, new Date(2026, 10, 11));
	assert.deepEqual(event!.end, new Date(2026, 10, 12));
	assert.equal(holidayEvents('PL', list, new Date(2026, 11, 1), new Date(2027, 0, 1))[0]!.description, undefined);
});
