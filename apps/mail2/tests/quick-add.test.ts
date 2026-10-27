import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuickAdd } from '../src/lib/calendar/quick-add.ts';
import { dayGaps, dayVoice, span } from '../src/lib/calendar/day-shape.ts';

// Tuesday 27 October 2026, 13:30.
const NOW = new Date(2026, 9, 27, 13, 30);
const at = (month: number, day: number, hour = 0, minute = 0) => new Date(2026, month, day, hour, minute);
const read = (line: string) => parseQuickAdd(line, NOW)!;

test('English: weekday, time, duration, place and calendar', () => {
	const event = read('Lunch with Anna fri 13:00 45m @Długa 5 #work');
	assert.equal(event.title, 'Lunch with Anna');
	assert.deepEqual([event.start, event.end], [at(9, 30, 13), at(9, 30, 13, 45)]);
	assert.equal(event.location, 'Długa 5');
	assert.equal(event.calendar, 'work');
	assert.equal(event.allDay, false);
});

test('Polish: jutro o 10, a range, a month name', () => {
	let event = read('jutro o 10 dentysta');
	assert.equal(event.title, 'dentysta');
	assert.deepEqual(event.start, at(9, 28, 10));
	assert.deepEqual(event.end, at(9, 28, 11));

	event = read('Kolacja w piątek 19-21:30');
	assert.equal(event.title, 'Kolacja');
	assert.deepEqual([event.start, event.end], [at(9, 30, 19), at(9, 30, 21, 30)]);

	event = read('Urodziny mamy 3 listopada');
	assert.equal(event.title, 'Urodziny mamy');
	assert.equal(event.allDay, true);
	assert.deepEqual(event.start, at(10, 3));
});

test('a date alone is all day; a date gone by is next year', () => {
	const event = read('Trip 2.3');
	assert.equal(event.allDay, true);
	assert.deepEqual(event.start, new Date(2027, 2, 2));
	assert.equal(read('Conference 12 Nov').allDay, true);
	assert.deepEqual(read('Conference Nov 12th 9am').start, at(10, 12, 9));
});

test('repeats: weekdays, every monday, co tydzień', () => {
	let event = read('Standup mon-fri 9:00 15m');
	assert.equal(event.title, 'Standup');
	assert.deepEqual(event.recurrence?.byDay, ['mo', 'tu', 'we', 'th', 'fr']);
	assert.deepEqual([event.start, event.end], [at(9, 27, 9), at(9, 27, 9, 15)]);

	event = read('Joga w każdą środę 18:00 1h30');
	assert.equal(event.title, 'Joga');
	assert.deepEqual(event.recurrence, { frequency: 'weekly', interval: 1, byDay: ['we'] });
	assert.deepEqual([event.start, event.end], [at(9, 28, 18), at(9, 28, 19, 30)]);

	assert.equal(read('Czynsz co miesiąc 10.11').recurrence?.frequency, 'monthly');
});

test('times: am/pm, a range across pm, noon, next week for a weekday gone today', () => {
	assert.deepEqual(read('Call 3pm').start, at(9, 27, 15));
	const range = read('Workshop 10-2pm');
	assert.deepEqual([range.start, range.end], [at(9, 27, 10), at(9, 27, 14)]);
	assert.deepEqual(read('Lunch noon').start, at(9, 27, 12));
	// "tue 9:00" on a Tuesday at 13:30 is next Tuesday; "tue 15:00" is today.
	assert.deepEqual(read('Review tue 9:00').start, at(10, 3, 9));
	assert.deepEqual(read('Review tue 15:00').start, at(9, 27, 15));
});

test('a bare title is today at the next whole hour; numbers in a title stay', () => {
	const event = read('Call mum');
	assert.equal(event.dated || event.timed, false);
	assert.deepEqual(event.start, at(9, 27, 14));
	assert.equal(read('Top 10 albums').title, 'Top 10 albums');
	assert.equal(parseQuickAdd('   '), null);
});

test('gaps sit between events, merged across overlaps', () => {
	const ev = (h1: number, m1: number, h2: number, m2: number) => ({ title: '', allDay: false, start: at(9, 27, h1, m1), end: at(9, 27, h2, m2) });
	const events = [ev(9, 0, 9, 15), ev(10, 0, 11, 30), ev(10, 30, 11, 30), ev(15, 30, 16, 15), ev(16, 30, 17, 0)];
	assert.deepEqual(
		dayGaps(events, at(9, 27)).map((gap) => [gap.start.getHours(), gap.start.getMinutes(), gap.minutes]),
		[
			[9, 15, 45],
			[11, 30, 240]
		]
	);
	// The night after a late event is not free time; the morning after it is.
	const late = [ev(0, 0, 3, 0), ev(9, 0, 10, 0)];
	assert.deepEqual(
		dayGaps(late, at(9, 27)).map((gap) => [gap.start.getHours(), gap.minutes]),
		[[7, 120]]
	);
});

test('the day voice: in something, free until, or done for today', () => {
	const ev = (title: string, d: number, h1: number, m1: number, h2: number, m2: number) => ({ title, allDay: false, start: at(9, d, h1, m1), end: at(9, d, h2, m2) });
	const review = ev('Review', 27, 13, 0, 14, 0);
	const kids = ev('Kids', 27, 15, 30, 16, 15);
	const standup = ev('Standup', 28, 9, 0, 9, 15);
	let voice = dayVoice([kids, review, standup], NOW);
	assert.equal(voice.kind, 'now');
	assert.equal(voice.kind === 'now' && voice.left, 30);
	voice = dayVoice([kids, standup], NOW);
	assert.deepEqual(voice.kind === 'free' && [voice.minutes, voice.next.title], [120, 'Kids']);
	voice = dayVoice([standup], NOW);
	assert.equal(voice.kind === 'later' && voice.next.title, 'Standup');
	assert.equal(dayVoice([], NOW).kind, 'clear');
	assert.deepEqual([span(45), span(60), span(105)], ['45 min', '1 h', '1 h 45']);
});
