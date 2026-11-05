import assert from 'node:assert/strict';
import { test } from 'node:test';
import { arrange, moved, wholeOrder } from '#lib/arrange';
import { axisTicks, columnTicks } from '#lib/columns';
import { columnBox, linePaths, pixelPath, stepPaths } from '#lib/pulse';
import { openDb } from '#lib/server/db';
import { dayOf, recordHit } from '#lib/server/ingest';
import { readArrangement, writeArrangement } from '#lib/server/prefs';
import { overview, report } from '#lib/server/report';
import { siteById, SITES } from '#lib/sites';
import { groupRows } from '#lib/sources';
import { readChart, readDays, readWho, viewHref } from '#lib/view';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const NOW = Date.parse('2026-11-05T12:00:00Z'); // 13:00 in Warsaw
const HOUR = 3_600_000;
const ctx = (now: number, id = 'kompi') => ({ site: siteById(id)!, host: siteById(id)!.hosts[0], ua: UA, owner: false, place: {}, now });
const hit = (id: string, over = {}) => ({ k: 'view', id, path: '/', tz: 'Europe/Warsaw', lang: 'pl-PL', w: 1600, h: 900, screen: '1920x1080', dpr: 1, dark: 0, ...over });

test('a line stops at the current reading, and its readings add up', () => {
	const db = openDb(':memory:');
	recordHit(db, hit('a1111111'), ctx(NOW));
	recordHit(db, hit('a2222222'), ctx(NOW - 2 * HOUR));
	recordHit(db, hit('a3333333'), ctx(NOW - 40 * HOUR));
	const line = overview(db, NOW, { days: 7 });
	assert.equal(line.step, 1);
	assert.equal(line.slots, 7 * 24);
	assert.equal(line.filled, 6 * 24 + 13 + 1);
	const k = line('kompi');
	assert.equal(k.pulse.length, line.filled);
	assert.equal(k.pulse.at(-1), 1);
	assert.equal(k.pulse.reduce((a, b) => a + b, 0), k.count);
	assert.equal(k.count, 3);
});

test('whose visits an overview counts', () => {
	const db = openDb(':memory:');
	recordHit(db, hit('b1111111'), ctx(NOW));
	recordHit(db, hit('b2222222', { me: 1 }), ctx(NOW));
	assert.equal(overview(db, NOW)('kompi').count, 1);
	assert.equal(overview(db, NOW, { who: 'mine' })('kompi').count, 1);
	assert.equal(overview(db, NOW, { who: 'all' })('kompi').count, 2);
	assert.deepEqual(overview(db, NOW).counts, { mine: 1, others: 1 });
});

test('a report stacks a line per day, and today stops at this hour', () => {
	const db = openDb(':memory:');
	recordHit(db, hit('c1111111'), ctx(NOW));
	recordHit(db, hit('c2222222'), ctx(NOW - 24 * HOUR));
	const r = report(db, { site: 'kompi', days: 7, now: NOW });
	assert.equal(r.stack.rows.length, 7);
	const last = r.stack.rows.at(-1)!;
	assert.equal(last.label, dayOf(NOW));
	assert.equal(last.hours.length, 14);
	assert.equal(last.n, 1);
	assert.equal(r.stack.rows.at(-2)!.hours.length, 24);
	assert.equal(r.stack.rows.at(-2)!.n, 1);
	assert.equal(r.stack.peak, 1);
});

test('90 days stack by the week, and a tag by its days with visits', () => {
	const db = openDb(':memory:');
	recordHit(db, hit('d1111111', { tag: 'launch' }), ctx(NOW - 200 * HOUR, 'zaur'));
	recordHit(db, hit('d2222222'), ctx(NOW, 'zaur'));
	const long = report(db, { site: 'zaur', days: 90, now: NOW });
	assert.equal(long.stack.rows.length, 13);
	assert.ok(long.stack.rows[0].to);
	assert.equal(long.stack.rows.reduce((a, r) => a + r.n, 0), 2);
	const tagged = report(db, { site: 'zaur', tag: 'launch', now: NOW });
	assert.equal(tagged.stack.rows.length, 1);
	assert.equal(tagged.stack.rows[0].n, 1);
});

test('a line draws what it was given, and an empty one draws nothing', () => {
	assert.deepEqual(linePaths([], 24, 1), { line: '', tail: '', area: '' });
	// A line short of its last slot ends in a reading still counting, kept apart from the whole ones.
	const { line, tail, area } = linePaths([0, 4], 3, 4);
	assert.equal(line, 'M0.0 99.0');
	assert.equal(tail, 'M0.0 99.0L500.0 2.0V100');
	assert.ok(area.endsWith('L500.0 100L0 100Z'));
	assert.equal(linePaths([1], 24, 1).line, 'M0 99');
	// A full line has no tail, unless it rolls and its last reading is still counting.
	assert.equal(linePaths([0, 4, 1], 3, 4).tail, '');
	assert.match(linePaths([0, 4, 1], 3, 4, false, true).tail, /^M500\.0 2\.0L1000\.0 /);
	assert.equal(pixelPath([0, 4], 200, 100, 4), 'M0.0 99.0L200.0 2.0');
	assert.equal(pixelPath([1], 200, 100, 1), '');
});

test('an overview counts a column a day, and today alone by its hours', () => {
	const db = openDb(':memory:');
	recordHit(db, hit('e1111111'), ctx(NOW));
	recordHit(db, hit('e2222222'), ctx(NOW));
	recordHit(db, hit('e3333333'), ctx(NOW - 48 * HOUR));
	const week = overview(db, NOW, { days: 7 });
	assert.equal(week.columnSlots, 7);
	assert.equal(week.columnPeak, 2);
	assert.deepEqual(week('kompi').columns, [0, 0, 0, 0, 1, 0, 2]);
	assert.deepEqual(week('yoga').columns, [0, 0, 0, 0, 0, 0, 0]);
	const today = overview(db, NOW, { days: 1 });
	assert.equal(today.columnSlots, 24);
	assert.equal(today('kompi').columns.length, 14);
	assert.equal(today('kompi').columns.at(-1), 2);
});

test('a scale always has five ticks, so its rules stay put whatever the counts', () => {
	assert.deepEqual(axisTicks(0), [0, 1, 2, 3, 4]);
	assert.deepEqual(axisTicks(1), [0, 1, 2, 3, 4]);
	assert.deepEqual(axisTicks(7), [0, 2, 4, 6, 8]);
	assert.deepEqual(axisTicks(120), [0, 30, 60, 90, 120]);
	assert.deepEqual(axisTicks(189), [0, 50, 100, 150, 200]);
	assert.deepEqual(axisTicks(1000), [0, 250, 500, 750, 1000]);
	for (const peak of [0, 1, 2, 3, 4, 5, 9, 11, 37, 41, 99, 101, 999, 12_345, 3_000_000]) {
		const ticks = axisTicks(peak);
		assert.equal(ticks.length, 5, `${peak} has five ticks`);
		assert.ok(ticks.at(-1)! >= peak, `${peak} fits under its scale`);
		assert.ok(ticks.every(Number.isInteger), `${peak} has whole ticks`);
		assert.equal(new Set(ticks.map((t, i) => t - (ticks[i - 1] ?? -ticks[1]))).size, 1, `${peak} has even ticks`);
	}
});

test('a stepped line holds each slot flat, and its last reading is still counting', () => {
	const { line, tail, area, stems } = stepPaths([4, 16, 9], 4, 16, true);
	assert.equal(line, 'M0 74.8V74.8H250.0V2.0H500.0');
	assert.equal(tail, 'M500.0 2.0V44.4H750.0V99');
	assert.ok(area.startsWith('M0 100V99') && area.endsWith('H750.0V100Z'));
	assert.equal(stems, 'M0 99V74.8M250.0 99V74.8M500.0 99V44.4');
	assert.equal(stepPaths([], 4, 16).line, '');
	assert.equal(stepPaths([5], 4, 16).line, '', 'a single reading is only its tail');
});

test('the held column stands on the baseline at the height of its reading', () => {
	const box = columnBox(2, 16, 4, 16, true);
	assert.deepEqual(box, { x: 500, y: 2, width: 250, height: 97 });
});

test('the overview is ranked, or in the order the owner gave it', () => {
	const rows = SITES.map((s, i) => ({ id: s.id, no: i + 1, count: s.id === 'kino' ? 50 : s.id === 'yoga' ? 90 : 0 }));
	assert.deepEqual(arrange(rows, { order: [], ranked: true }).slice(0, 3).map((r) => r.id), ['yoga', 'kino', 'zaur']);
	const own = arrange(rows, { order: ['kurcz', 'zaur'], ranked: false }).map((r) => r.id);
	assert.deepEqual(own.slice(0, 3), ['kurcz', 'zaur', 'yoga']);
	assert.equal(own.length, SITES.length);
});

test('a saved order keeps to the sites there are, and a new site lands at the end', () => {
	const kept = wholeOrder(['music', 'gone', 'music', 7, 'zaur']);
	assert.deepEqual(kept.slice(0, 2), ['music', 'zaur']);
	assert.deepEqual(new Set(kept), new Set(SITES.map((s) => s.id)));
	assert.equal(kept.length, SITES.length);
	assert.deepEqual(wholeOrder('nonsense'), SITES.map((s) => s.id));
	assert.deepEqual(moved(['a', 'b', 'c', 'd'], 3, 0), ['d', 'a', 'b', 'c']);
	assert.deepEqual(moved(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
});

test('how the owner arranged the overview is kept per owner, ranked until they say otherwise', () => {
	const db = openDb(':memory:');
	assert.deepEqual(readArrangement(db, 'a@zaur.app'), { order: SITES.map((s) => s.id), ranked: true });
	writeArrangement(db, 'A@zaur.app ', { order: ['kurcz'], ranked: false });
	const mine = readArrangement(db, 'a@zaur.app');
	assert.equal(mine.ranked, false);
	assert.equal(mine.order[0], 'kurcz');
	assert.equal(mine.order.length, SITES.length);
	writeArrangement(db, 'a@zaur.app', { ranked: true });
	const again = readArrangement(db, 'a@zaur.app');
	assert.equal(again.ranked, true);
	assert.equal(again.order[0], 'kurcz', 'ranking keeps the own order for later');
	assert.equal(readArrangement(db, 'b@zaur.app').ranked, true);
});

test('columns are dated by the hour, the day or the Monday', () => {
	assert.deepEqual(columnTicks(1, '2026-11-05').map((t) => t.label), ['00:00', '06:00', '12:00', '18:00']);
	const week = columnTicks(7, '2026-10-30');
	assert.equal(week.length, 7);
	assert.deepEqual([week[0].over, week[0].label], ['Fri', '30 Oct']);
	assert.deepEqual(columnTicks(30, '2026-10-07').map((t) => t.label), ['12 Oct', '19 Oct', '26 Oct', '2 Nov']);
	const quarter = columnTicks(90, '2026-08-08');
	assert.equal(quarter[0].label, '10 Aug');
	assert.ok(quarter.length <= 7);
	assert.ok(quarter.some((t) => t.minor));
});

test('a source strip leaves out moves within the site and keeps its order', () => {
	const groups = groupRows([['internal', 50], ['mail', 2], ['tagged', 3], ['search', 5], ['direct', 1]]);
	assert.deepEqual(groups.map((g) => [g.id, g.n]), [['direct', 1], ['search', 5], ['rest', 5]]);
});

test('a view is read and linked the same way', () => {
	const q = new URLSearchParams('who=mine&days=7');
	assert.equal(readWho(q), 'mine');
	assert.equal(readDays(q), 7);
	assert.equal(readDays(new URLSearchParams('days=12')), 30);
	assert.equal(viewHref({ site: null, who: 'others', days: 30 }), '/');
	assert.equal(viewHref({ site: 'yoga', who: 'mine', days: 7 }), '/s/yoga?who=mine&days=7');
	assert.equal(viewHref({ site: null, who: 'others', days: 7, live: true }), '/s/all/live');
	assert.equal(viewHref({ site: 'yoga', who: 'others', days: 30, extra: { view: 'visits' } }), '/s/yoga?view=visits');
	assert.equal(readChart(new URLSearchParams('chart=days')), 'days');
	assert.equal(readChart(new URLSearchParams('chart=pie')), 'pulse');
	assert.equal(viewHref({ site: 'yoga', who: 'others', days: 30, chart: 'pulse' }), '/s/yoga');
	assert.equal(viewHref({ site: 'yoga', who: 'others', days: 7, chart: 'days' }), '/s/yoga?days=7&chart=days');
	assert.equal(viewHref({ site: 'yoga', who: 'others', days: 7, chart: 'days', live: true }), '/s/yoga/live');
});
