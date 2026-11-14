import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
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
import { readChart, readDays, readFilters, readVisitOrder, readWho, viewHref, visitQuery, VISITS_PER_PAGE } from '#lib/view';

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
	recordHit(db, hit('b3333333', { tz: 'UTC' }), ctx(NOW));
	assert.equal(overview(db, NOW)('kompi').count, 1);
	assert.equal(overview(db, NOW, { who: 'mine' })('kompi').count, 1);
	assert.equal(overview(db, NOW, { who: 'all' })('kompi').count, 2);
	assert.equal(overview(db, NOW, { who: 'bots' })('kompi').count, 1);
	assert.deepEqual(overview(db, NOW).counts, { mine: 1, others: 1, bots: 1 });
	assert.equal(report(db, { site: 'kompi', now: NOW, who: 'bots' }).botsCount, 1);
	assert.equal(report(db, { site: 'kompi', now: NOW, who: 'bots' }).recent[0].bot, 'utc');
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
	const rows = SITES.map((s, i) => ({ id: s.id, no: i + 1, count: s.id === 'kino' ? 50 : s.id === 'yoga' ? 90 : 0, was: null, today: 0, live: 0 }));
	assert.deepEqual(arrange(rows, { order: [], sort: 'count', asc: false }).slice(0, 3).map((r) => r.id), ['yoga', 'kino', 'zaur']);
	const own = arrange(rows, { order: ['kurcz', 'zaur'], sort: 'own', asc: false }).map((r) => r.id);
	assert.deepEqual(own.slice(0, 3), ['kurcz', 'zaur', 'yoga']);
	assert.equal(own.length, SITES.length);
});

test('the overview runs by any of its figures, either way, with a dash always last', () => {
	const row = (id: string, no: number, count: number, was: number | null, today = 0, live = 0) => ({ id, no, count, was, today, live });
	const rows = [row('a', 1, 40, 80, 1, 0), row('b', 2, 30, 10, 5, 2), row('c', 3, 20, null, 3, 0), row('d', 4, 10, 0, 0, 9), row('e', 5, 0, 0)];
	const ids = (sort: 'count' | 'change' | 'today' | 'live', asc = false) => arrange(rows, { order: [], sort, asc }).map((r) => r.id).join('');
	assert.equal(ids('count'), 'abcde');
	assert.equal(ids('count', true), 'edcba');
	assert.equal(ids('today'), 'bcade');
	assert.equal(ids('live'), 'dbace', 'equal figures fall back to the ranking');
	// d's visits are its first, which outgrows any change; c and e have nothing to compare.
	assert.equal(ids('change'), 'dbace');
	assert.equal(ids('change', true), 'abdce');
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
	assert.deepEqual(readArrangement(db, 'a@zaur.app'), { order: SITES.map((s) => s.id), sort: 'count', asc: false });
	writeArrangement(db, 'A@zaur.app ', { order: ['kurcz'], sort: 'own' });
	const mine = readArrangement(db, 'a@zaur.app');
	assert.equal(mine.sort, 'own');
	assert.equal(mine.order[0], 'kurcz');
	assert.equal(mine.order.length, SITES.length);
	writeArrangement(db, 'a@zaur.app', { sort: 'change', asc: true });
	const again = readArrangement(db, 'a@zaur.app');
	assert.deepEqual([again.sort, again.asc], ['change', true]);
	assert.equal(again.order[0], 'kurcz', 'ranking keeps the own order for later');
	assert.equal(readArrangement(db, 'b@zaur.app').sort, 'count');
});

test('a store from before a column could be chosen keeps what its owner had', async () => {
	const { mkdtempSync, rmSync } = await import('node:fs');
	const { tmpdir } = await import('node:os');
	const { join } = await import('node:path');
	const dir = mkdtempSync(join(tmpdir(), 'stats-'));
	try {
		const old = new DatabaseSync(join(dir, 'stats.db'));
		old.exec(`CREATE TABLE prefs (email TEXT PRIMARY KEY, site_order TEXT, ranked INTEGER NOT NULL DEFAULT 1);
			INSERT INTO prefs VALUES ('own@zaur.app', '["kurcz"]', 0), ('ranked@zaur.app', NULL, 1)`);
		old.close();
		const db = openDb(join(dir, 'stats.db'));
		assert.equal(readArrangement(db, 'own@zaur.app').sort, 'own');
		assert.equal(readArrangement(db, 'own@zaur.app').order[0], 'kurcz');
		assert.equal(readArrangement(db, 'ranked@zaur.app').sort, 'count');
		writeArrangement(db, 'own@zaur.app', { sort: 'today' });
		assert.equal(readArrangement(db, 'own@zaur.app').sort, 'today');
		// A build from before `sort` still reads whether it was ranked.
		assert.equal((db.prepare(`SELECT ranked FROM prefs WHERE email = 'own@zaur.app'`).get() as { ranked: number }).ranked, 1);
		db.close();
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('a visit log runs by any column, with an empty one last either way', () => {
	const db = openDb(':memory:');
	const at = (id: string, hoursAgo: number, over = {}) => recordHit(db, hit(id, over), ctx(NOW - hoursAgo * HOUR));
	at('f1111111', 1, { path: '/b' });
	at('f2222222', 2, { path: '/a', w: 390, h: 800 });
	at('f3333333', 3, { path: '/C' });
	db.prepare(`UPDATE views SET secs = 40, org = 'Orange' WHERE id = 'f2222222'`).run();
	db.prepare(`UPDATE views SET secs = 5, org = 'apple' WHERE id = 'f3333333'`).run();
	const log = (by: Parameters<typeof report>[1]['visits'] & {}) => report(db, { site: 'kompi', days: 7, now: NOW, visits: by }).recent.map((v) => v.path).join(' ');
	assert.equal(log({ by: 'when', asc: false, page: 1 }), '/b /a /C');
	assert.equal(log({ by: 'when', asc: true, page: 1 }), '/C /a /b');
	assert.equal(log({ by: 'page', asc: true, page: 1 }), '/a /b /C', 'capitals sort with small letters');
	assert.equal(log({ by: 'time', asc: false, page: 1 }), '/a /C /b');
	assert.equal(log({ by: 'time', asc: true, page: 1 }), '/C /a /b', 'a visit with no time yet stays last');
	assert.equal(log({ by: 'network', asc: true, page: 1 }), '/C /a /b');
	assert.equal(log({ by: 'device', asc: false, page: 1 }), '/a /b /C', 'the phone, then the desktops, latest first');
	for (const by of ['site', 'from', 'where', 'read'] as const) assert.equal(log({ by, asc: true, page: 1 }).length, 8, `${by} orders without failing`);
});

test('a visit log comes a page at a time, and a page past the end is the last one', () => {
	const db = openDb(':memory:');
	const total = VISITS_PER_PAGE + 5;
	for (let i = 0; i < total; i++) recordHit(db, hit(`g${String(i).padStart(7, '0')}`, { path: `/p${i}` }), ctx(NOW - i * 60_000));
	const first = report(db, { site: 'kompi', days: 7, now: NOW });
	assert.equal(first.views, total);
	assert.equal(first.recent.length, VISITS_PER_PAGE);
	assert.equal(first.recent[0].path, '/p0');
	const second = report(db, { site: 'kompi', days: 7, now: NOW, visits: { by: 'when', asc: false, page: 2 } });
	assert.equal(second.recent.length, 5);
	assert.equal(second.recent[0].path, `/p${VISITS_PER_PAGE}`);
	const beyond = report(db, { site: 'kompi', days: 7, now: NOW, visits: { by: 'when', asc: false, page: 9 } });
	assert.equal(beyond.page, 2);
	assert.equal(beyond.recent.length, 5);
});

test('a report narrows to a row of one of its lists, and to several at once', () => {
	const db = openDb(':memory:');
	recordHit(db, hit('h1111111', { path: '/pricing', lang: 'pl-PL' }), ctx(NOW));
	recordHit(db, hit('h2222222', { path: '/pricing', lang: 'en-GB' }), ctx(NOW - HOUR));
	recordHit(db, hit('h3333333', { path: '/', lang: 'en-US' }), ctx(NOW - 2 * HOUR));
	recordHit(db, hit('h4444444', { path: '/pricing', lang: 'pl-PL' }), ctx(NOW - 10 * 24 * HOUR));
	const whole = report(db, { site: 'kompi', days: 7, now: NOW });
	assert.equal(whole.views, 3);
	const page = report(db, { site: 'kompi', days: 7, now: NOW, filters: { path: '/pricing' } });
	assert.equal(page.views, 2);
	assert.deepEqual(page.pages.map((p) => p.path), ['/pricing']);
	assert.deepEqual([...page.langs].sort(), [['en', 1], ['pl', 1]]);
	assert.equal(page.stack.rows.reduce((a, r) => a + r.n, 0), 2);
	assert.equal(page.recent.length, 2);
	assert.deepEqual(page.filters, { path: '/pricing' });
	// A list's own words lead back to the same rows, whatever the list is named by.
	for (const [k, list] of [['lang', whole.langs], ['system', whole.systems], ['screen', whole.screens], ['place', whole.places], ['source', whole.sources]] as const) {
		for (const [value, n] of list) assert.equal(report(db, { site: 'kompi', days: 7, now: NOW, filters: { [k]: value } }).views, n, `${k} ${value}`);
	}
	assert.equal(report(db, { site: 'kompi', days: 7, now: NOW, filters: { path: '/pricing', lang: 'en' } }).views, 1);
	assert.equal(report(db, { site: 'kompi', days: 7, now: NOW, filters: { path: "/x' OR 1=1 --" } }).views, 0);
	// The period before is narrowed too, so a change compares like with like.
	recordHit(db, hit('h5555555', { path: '/' }), ctx(NOW - 30 * 24 * HOUR));
	assert.equal(report(db, { site: 'kompi', days: 7, now: NOW, filters: { path: '/pricing' } }).was, 1);
	assert.equal(report(db, { site: 'kompi', days: 7, now: NOW }).was, 1);
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
	assert.equal(viewHref({ site: 'yoga', who: 'others', days: 30, extra: { path: '/a b', tag: undefined } }), '/s/yoga?path=%2Fa+b');
});

test('a site with parts counts each by the pages under its path, and narrows to one', () => {
	const db = openDb(':memory:');
	const open = (id: string, path: string) => recordHit(db, hit(id, { path }), ctx(NOW, 'svelte'));
	open('p1111111', '/');
	open('p2222222', '/calendar');
	open('p3333333', '/calendar/docs');
	open('p4444444', '/search');
	open('p5555555', '/calendars');
	const hub = report(db, { site: 'svelte', days: 7, now: NOW });
	assert.equal(hub.views, 5);
	assert.deepEqual(hub.parts, [['/calendar', 2], ['/search', 1]], 'a part with no visits has no row, and a longer name is another page');
	const calendar = report(db, { site: 'svelte', days: 7, now: NOW, filters: { under: '/calendar' } });
	assert.equal(calendar.views, 2);
	assert.deepEqual(calendar.pages.map((p) => p.path).sort(), ['/calendar', '/calendar/docs']);
	assert.deepEqual(calendar.parts, [['/calendar', 2]]);
	assert.equal(report(db, { site: 'svelte', days: 7, now: NOW, filters: { under: '/calendar/' } }).views, 2);
	assert.equal(report(db, { site: 'svelte', days: 7, now: NOW, filters: { under: '/' } }).views, 5);
	assert.equal(report(db, { site: 'svelte', days: 7, now: NOW, filters: { under: '/c%' } }).views, 0, 'a % in a path is only itself');
	assert.equal(report(db, { site: 'svelte', days: 7, now: NOW, filters: { under: '/calendar', path: '/calendar/docs' } }).views, 1);
	assert.deepEqual(report(db, { site: 'kompi', days: 7, now: NOW }).parts, []);
	assert.deepEqual(report(db, { site: 'all', days: 7, now: NOW }).parts, []);
});

test('filters and a log\'s order are read from the address, and the usual is left out of it', () => {
	assert.deepEqual(readFilters(new URLSearchParams('path=/x&lang=pl&days=7&nonsense=1&ref=')), { path: '/x', lang: 'pl' });
	assert.deepEqual(readVisitOrder(new URLSearchParams('')), { by: 'when', asc: false, page: 1 });
	assert.deepEqual(readVisitOrder(new URLSearchParams('sort=page')), { by: 'page', asc: true, page: 1 });
	assert.deepEqual(readVisitOrder(new URLSearchParams('sort=time&dir=asc&page=3')), { by: 'time', asc: true, page: 3 });
	assert.deepEqual(readVisitOrder(new URLSearchParams('sort=toString&page=-2')), { by: 'when', asc: false, page: 1 });
	assert.deepEqual(visitQuery({ by: 'when', asc: false, page: 1 }), { view: 'visits' });
	assert.deepEqual(visitQuery({ by: 'page', asc: false, page: 2 }), { view: 'visits', sort: 'page', dir: 'desc', page: '2' });
	assert.deepEqual(visitQuery({ by: 'time', asc: false, page: 1 }), { view: 'visits', sort: 'time' });
});
