import assert from 'node:assert/strict';
import { test } from 'node:test';
import { linePaths, pixelPath } from '#lib/pulse';
import { openDb } from '#lib/server/db';
import { dayOf, recordHit } from '#lib/server/ingest';
import { overview, report } from '#lib/server/report';
import { siteById } from '#lib/sites';
import { groupRows } from '#lib/sources';
import { readDays, readWho, viewHref } from '#lib/view';

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
});
