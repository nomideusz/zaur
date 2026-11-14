import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { openDb } from '#lib/server/db';
import { markAgainAll, memory } from '#lib/server/visits';
import { dayOf, isOwnerIp, markOwnerIp, overLimit, recordHit, source, sweep } from '#lib/server/ingest';
import { network } from '#lib/server/geo';
import { liveSnapshot, overview, report } from '#lib/server/report';
import { cleanPath, siteById, siteForHost } from '#lib/sites';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const NOW = Date.parse('2026-11-05T12:00:00Z');
const site = (id: string) => siteById(id)!;
const ctx = (id: string, over = {}) => ({ site: site(id), host: site(id).hosts[0], ua: UA, owner: false, place: {}, now: NOW, ...over });
const view = (id: string, over = {}) => ({ k: 'view', id, path: '/', tz: 'Europe/Warsaw', lang: 'pl-PL', w: 1600, h: 900, screen: '1920x1080', dpr: 1, dark: 0, ...over });

test('a beacon counts for the site its origin names, and only a listed one', () => {
	assert.equal(siteForHost('szkolyjogi.pl')?.id, 'yoga');
	assert.equal(siteForHost('sobo.szkolyjogi.pl')?.id, 'yoga');
	assert.equal(siteForHost('panel.szkolyjogi.pl'), undefined);
	assert.equal(siteForHost('festivals.zaur.app')?.id, 'festivals');
	assert.equal(siteForHost('radiobartek.com')?.id, 'radiobartek');
	assert.equal(siteForHost('stats.zaur.app'), undefined);
	assert.equal(siteForHost('evil.example'), undefined);
});

test('a page whose address holds a secret is never kept, and a named one is masked', () => {
	assert.equal(cleanPath(site('yoga'), '/pass/abc123'), null);
	assert.equal(cleanPath(site('yoga'), '/wypisz/1.hmac'), null);
	assert.equal(cleanPath(site('yoga'), '/passat'), '/passat');
	assert.equal(cleanPath(site('thebest'), '/bookings/REF9'), null);
	assert.equal(cleanPath(site('mail'), '/meet/secret-room'), null);
	assert.equal(cleanPath(site('music'), '/album/42'), '/album/…');
	assert.equal(cleanPath(site('radiobartek'), '/admin/settings'), null);
	assert.equal(cleanPath(site('radiobartek'), '/shows'), '/shows');
	assert.equal(cleanPath(site('kino'), '/watch'), null);
	assert.equal(cleanPath(site('kino'), '/en/channel/UC1'), null);
	assert.equal(cleanPath(site('kino'), '/en/barlinek'), '/en/barlinek');
	assert.equal(cleanPath(site('kino'), '/watchmen'), '/watchmen');

	const db = openDb(':memory:');
	assert.equal(recordHit(db, view('aaaaaaaa', { path: '/pass/abc123' }), ctx('yoga')), false);
	assert.equal(recordHit(db, view('bbbbbbbb', { path: '/krakow?x=1#y' }), ctx('yoga')), 'view');
	const row = db.prepare('SELECT path FROM views').get() as { path: string };
	assert.equal(row.path, '/krakow');
});

test('a signed-in app keeps no clicks, sections, hash or tag', () => {
	const db = openDb(':memory:');
	recordHit(db, view('cccccccc', { tag: 'x', hash: '#private' }), ctx('mail'));
	recordHit(db, { k: 'end', id: 'cccccccc', secs: 5, depth: 50, clicks: ['re: your invoice'], seen: { body: 4 } }, ctx('mail'));
	const row = db.prepare('SELECT * FROM views').get() as Record<string, unknown>;
	assert.equal(row.tag, null);
	assert.equal(row.hash, null);
	assert.equal(row.clicks, null);
	assert.equal(row.seen, null);
	assert.equal(row.secs, 5);
});

test('crawlers are left out', () => {
	const db = openDb(':memory:');
	assert.equal(recordHit(db, view('dddddddd'), ctx('kurcz', { ua: 'Googlebot/2.1' })), false);
	assert.equal(recordHit(db, view('eeeeeeee'), ctx('kurcz', { ua: '' })), false);
	assert.equal(recordHit(db, view('ffffffff', { tz: 'Asia/Shanghai', w: 1280 }), ctx('kurcz')), false);
	assert.equal(recordHit(db, view('gggggggg', { tz: 'Etc/Unknown' }), ctx('kurcz')), false);
	assert.equal(recordHit(db, view('not an id!')  , ctx('kurcz')), false);
});

test('no column holds an address', () => {
	const db = openDb(':memory:');
	const columns = (db.prepare('PRAGMA table_info(views)').all() as { name: string }[]).map((c) => c.name);
	assert.ok(!columns.some((c) => /ip|addr/i.test(c)), columns.join());
	markOwnerIp(db, '203.0.113.9', 'key', NOW);
	const stored = db.prepare('SELECT hash FROM owner_ips').get() as { hash: string };
	assert.ok(!stored.hash.includes('203.0.113'));
	assert.ok(isOwnerIp(db, '203.0.113.9', 'key', NOW));
	assert.ok(!isOwnerIp(db, '203.0.113.10', 'key', NOW));
	assert.ok(!isOwnerIp(db, '203.0.113.9', 'other-key', NOW));
	assert.ok(!isOwnerIp(db, '203.0.113.9', 'key', NOW + 90 * 86_400_000));
});

test('where a visit came from', () => {
	const yoga = site('yoga');
	assert.equal(source({ ref: 'www.google.com' }), 'search');
	assert.equal(source({ ref: 'gemini.google.com' }), 'ai');
	assert.equal(source({ ref: 'mail.google.com' }), 'mail');
	assert.equal(source({ ref: 'l.facebook.com' }), 'social');
	assert.equal(source({ browser: 'Instagram app' }), 'social');
	assert.equal(source({}), 'direct');
	assert.equal(source({ tag: 'acme', ref: 'www.google.com' }), 'tagged');
	assert.equal(source({ tag: 'chatgpt.com' }), 'ai');
	assert.equal(source({ ref: 'panel.szkolyjogi.pl', site: yoga }), 'internal');
	assert.equal(source({ ref: 'kurcz.pl', site: yoga }), 'own');
	assert.equal(source({ ref: 'festivals.zaur.app', site: site('zaur') }), 'own');
	assert.equal(source({ internal: true, ref: '/krakow' }), 'internal');
});

test('the old lookup still reads both shapes', () => {
	assert.equal(network({ company: 'cloud', asn: 'AS8075 Microsoft Corporation' }).org, 'Microsoft Corporation');
	assert.equal(network({ company: { name: 'Acme', type: 'business' }, location: { city: 'Kraków' }, is_vpn: true }).vpn, 1);
});

test('a report tells others from the owner, and compares only a whole period', () => {
	const db = openDb(':memory:');
	recordHit(db, view('h0000000'), ctx('yoga', { now: NOW - 40 * 86_400_000 }));
	assert.equal(report(db, { site: 'yoga', days: 30, now: NOW }).was, null); // the log began inside the previous 30 days
	recordHit(db, view('h0000001'), ctx('yoga', { now: NOW - 59 * 86_400_000 }));
	recordHit(db, view('h1111111', { path: '/krakow', ref: 'www.google.com' }), ctx('yoga'));
	recordHit(db, { k: 'end', id: 'h1111111', secs: 40, depth: 80, clicks: ['phone', 'phone'], seen: { grafik: 12, opinie: 1 } }, ctx('yoga'));
	recordHit(db, view('h2222222', { path: '/krakow', me: 1 }), ctx('yoga'));
	recordHit(db, view('h3333333', { path: '/gdansk', w: 1601 }), ctx('yoga', { owner: true }));
	recordHit(db, view('h4444444', { path: '/x', internal: 1, ref: '/krakow' }), ctx('yoga'));
	recordHit(db, view('h5555555', { tag: 'acme' }), ctx('kurcz'));

	const r = report(db, { site: 'yoga', days: 30, now: NOW });
	assert.equal(r.views, 2);
	assert.equal(r.entries, 1);
	assert.equal(r.mineCount, 2);
	assert.equal(r.othersCount, 1); // visits: the click to /x is the same visit
	assert.equal(r.median, 40);
	assert.equal(r.depth, 80);
	assert.deepEqual(r.opened, [['phone', 1]]);
	assert.deepEqual(r.read, [['grafik', 1]]);
	assert.equal(r.was, 2); // the two visits in the 30 days before these
	assert.equal(r.bars.length, 30);
	assert.equal(r.bars.at(-1)!.n, 1); // a day's bar is its visits, not its pages
	assert.equal(r.recent.find((v) => v.id === 'h4444444')!.clicks, null); // no end yet
	assert.deepEqual(r.recent.find((v) => v.id === 'h1111111')!.clicks, ['phone', 'phone']);

	assert.equal(report(db, { site: 'yoga', who: 'mine', now: NOW }).views, 2);
	const today = report(db, { site: 'yoga', days: 1, who: 'all', now: NOW });
	assert.equal(today.bars.length, 14); // 13:00 in Warsaw is the 14th hour
	assert.equal(today.views, 4);

	assert.equal(report(db, { site: 'all', days: 30, now: NOW }).views, 3);
	const tagged = report(db, { site: 'kurcz', tag: 'acme', now: NOW + 200 * 86_400_000 });
	assert.equal(tagged.views, 1);
	assert.deepEqual(tagged.tags.map((t) => t.k), ['acme']);
});

test('the live picture puts a beacon in this minute and this hour', () => {
	const db = openDb(':memory:');
	recordHit(db, view('j1111111', { path: '/a' }), ctx('kino'));
	recordHit(db, view('j2222222', { path: '/a' }), ctx('kino', { now: NOW - 10 * 60_000 }));
	recordHit(db, view('j3333333', { path: '/b' }), ctx('kino', { now: NOW - 5 * 3600_000 }));
	recordHit(db, view('j4444444', { path: '/c' }), ctx('kino', { now: NOW - 30 * 3600_000 }));
	const s = liveSnapshot(db, { site: 'kino', now: NOW });
	assert.equal(s.minutes.at(-1), 1);
	assert.equal(s.minutes.at(-11), 1);
	assert.equal(s.minutes.reduce((a, b) => a + b), 2);
	assert.equal(s.hours.at(-1)! + s.hours.at(-2)!, 2);
	assert.equal(s.hours.at(-6), 1);
	assert.equal(s.hours.reduce((a, b) => a + b), 3);
	assert.deepEqual(s.pages.map((p) => [p.path, p.n]), [['/a', 2], ['/b', 1]]);
	assert.equal(s.recent.length, 4);
	assert.equal(liveSnapshot(db, { site: 'yoga', now: NOW }).recent.length, 0);
	assert.equal(liveSnapshot(db, { site: 'all', now: NOW }).recent.length, 4);
});

test('the overview, and keeping only what a site keeps', () => {
	const db = openDb(':memory:');
	recordHit(db, view('k1111111'), ctx('kompi'));
	recordHit(db, view('k2222222'), ctx('kompi', { now: NOW - 95 * 86_400_000 }));
	recordHit(db, view('k3333333'), ctx('zaur', { now: NOW - 400 * 86_400_000 }));
	const all = overview(db, NOW);
	const line = all('kompi');
	assert.equal(line.live, 1);
	assert.equal(line.today, 1);
	assert.equal(line.count, 1);
	assert.equal(line.pulse.length, all.filled);
	assert.equal(line.pulse.at(-1), 1);
	assert.equal(line.was, 0);
	// Every line shares one peak, whichever site holds it.
	assert.equal(all.peak, 1);
	assert.equal(all('kurcz').pulse.length, all.filled);
	sweep(db, NOW);
	const left = (db.prepare('SELECT id FROM views ORDER BY id').all() as { id: string }[]).map((r) => r.id);
	assert.deepEqual(left, ['k1111111', 'k3333333']);
});

test('one address cannot flood the table', () => {
	const ip = '198.51.100.7';
	let over = 0;
	for (let i = 0; i < 130; i++) if (overLimit(ip, NOW)) over++;
	assert.equal(over, 10);
	assert.equal(overLimit(ip, NOW + 61_000), false);
});

test('the copies of the tracker that signed-in apps serve themselves are this one', () => {
	const own = readFileSync(new URL('../static/s.js', import.meta.url), 'utf8');
	for (const copy of ['../../mail2/static/s.js', '../../music/static/s.js', '../../register/public/s.js']) {
		assert.equal(readFileSync(new URL(copy, import.meta.url), 'utf8'), own, copy);
	}
});

test('a browser back within half an hour is still on its visit', () => {
	const db = openDb(':memory:');
	const MIN = 60_000;
	memory.since = 0; // warm: an address seen nowhere is a browser new to the site
	const at = (now: number, ip = '203.0.113.7') => ctx('festivals', { now, ip });
	recordHit(db, view('v1000000', { tag: 'chatgpt.com' }), at(NOW - 120 * MIN));
	recordHit(db, view('v1000001', { path: '/x', internal: 1, ref: '/' }), at(NOW - 100 * MIN));
	recordHit(db, view('v1000002', { tag: 'chatgpt.com' }), at(NOW - 80 * MIN)); // 20 minutes after its last page
	recordHit(db, view('v1000003'), at(NOW - 40 * MIN)); // 40 minutes after: a new visit
	recordHit(db, view('v1000004'), at(NOW - 39 * MIN, '198.51.100.9')); // the same build, another address
	const r = report(db, { site: 'festivals', days: 1, who: 'all', now: NOW });
	assert.equal(r.views, 5);
	assert.equal(r.entries, 3);
	assert.equal(r.recent.find((v) => v.id === 'v1000002')!.again, 1);

	// A store from before: told apart by what its rows hold, the same rule.
	db.exec('UPDATE views SET again = NULL');
	markAgainAll(db);
	const marked = db.prepare('SELECT id FROM views WHERE again = 1 ORDER BY id').all().map((r) => r.id);
	assert.deepEqual(marked, ['v1000002', 'v1000004']);
});
