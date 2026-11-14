import assert from 'node:assert/strict';
import { test } from 'node:test';
import { botReason, clockFits } from '#lib/server/bots';
import { openDb } from '#lib/server/db';
import { recordHit } from '#lib/server/ingest';
import { siteById } from '#lib/sites';

const T = Date.parse('2026-11-05T12:00:00Z');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const person = { me: 0, t: T, tz: 'Europe/Warsaw', country: 'Poland', org: 'Orange Polska Spolka Akcyjna', device: 'desktop', browser: 'Chrome', screen: '1920x1080', w: 1912, secs: null };

test('a clock fits its country by the time it shows, not by its name', () => {
	assert.equal(clockFits('Europe/Warsaw', 'Poland', T), true);
	// Windows' "Belgrade, Bratislava, Budapest" on a Pole's laptop.
	assert.equal(clockFits('Europe/Budapest', 'Poland', T), true);
	assert.equal(clockFits('Asia/Calcutta', 'India', T), true);
	assert.equal(clockFits('Europe/Budapest', 'The Netherlands', T), true);
	assert.equal(clockFits('Asia/Jakarta', 'United States', T), false);
	assert.equal(clockFits('Europe/London', 'Poland', T), false);
	assert.equal(clockFits('Europe/Warsaw', 'Atlantis', T), null);
	assert.equal(clockFits(null, 'Poland', T), null);
});

test('what gives a bot away, and what a person may do anyway', () => {
	assert.equal(botReason(person), null);
	assert.equal(botReason({ ...person, tz: 'UTC' }), 'utc');
	assert.equal(botReason({ ...person, tz: 'UTC', me: 1 }), null);
	// Microsoft's Safe Links, opening a mailed link.
	assert.equal(botReason({ ...person, org: 'Microsoft Corporation', country: 'United States', tz: 'America/Los_Angeles', secs: 26 }), 'cloud');
	// A Pole whose network is on a cloud keeps their own clock.
	assert.equal(botReason({ ...person, org: 'Google LLC' }), null);
	// A residential proxy opens the page and is gone; a person on a VPN stays.
	const proxied = { ...person, org: 'Comcast Cable Communications, LLC', country: 'United States', tz: 'Asia/Jakarta' };
	assert.equal(botReason(proxied), 'proxy');
	assert.equal(botReason({ ...proxied, secs: 40 }), null);
	assert.equal(botReason({ ...proxied, org: 'Cloudflare, Inc.' }), null);
	assert.equal(botReason({ ...proxied, browser: null }), null);
	assert.equal(botReason({ ...person, screen: '800x600', w: 1366 }), 'headless');
	assert.equal(botReason({ ...person, screen: '800x600', w: 800 }), null);
});

test('a view is judged on arrival and again when it ends', () => {
	const db = openDb(':memory:');
	const site = siteById('kurcz')!;
	const ctx = { site, host: site.hosts[0], ua: UA, owner: false, place: { country: 'United States', org: 'Comcast Cable Communications, LLC' }, now: T };
	recordHit(db, { k: 'view', id: 'p1111111', path: '/', tz: 'Asia/Jakarta', lang: 'en-US', w: 1720, h: 800, screen: '1920x1080' }, ctx);
	const bot = () => (db.prepare("SELECT bot FROM views WHERE id = 'p1111111'").get() as { bot: string | null }).bot;
	assert.equal(bot(), 'proxy');
	recordHit(db, { k: 'end', id: 'p1111111', secs: 30, depth: 80 }, { ...ctx, now: T + 30_000 });
	assert.equal(bot(), null);
});
