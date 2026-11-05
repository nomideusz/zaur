/**
 * Brings the visits the old counters already hold into this store, once, before
 * the first boot: JSON lines on stdin, the store named by STATS_DB. Re-running
 * changes nothing, as a view is known by its id.
 *
 *   ssh contabo 'docker exec $(docker ps -qf name=app-zaur-web) cat /data/visits.jsonl' \
 *     | STATS_DB=./data/seed.db node --import tsx scripts/import.ts zaur
 *   ssh radio 'docker exec $(docker ps -qf name=yoga-pg) psql -U postgres -d yoga -Atc \
 *     "select row_to_json(s) from site_visits s order by at"' \
 *     | STATS_DB=./data/seed.db node --import tsx scripts/import.ts yoga
 */
import { text } from 'node:stream/consumers';
import { getDb } from '#lib/server/db';
import { dayOf, hourOf } from '#lib/server/ingest';
import { cleanPath, siteById } from '#lib/sites';
// @ts-expect-error A plain module of the site this one takes over from.
import { visits } from '../../web/stats.mjs';

type Row = {
	site: string;
	id: string;
	t: number;
	host: string;
	path: string;
	source: string;
	ref?: string | null;
	tag?: string | null;
	hash?: string | null;
	tz?: string | null;
	lang?: string | null;
	w?: number | null;
	h?: number | null;
	screen?: string | null;
	dpr?: number | null;
	dark?: number | null;
	device?: string | null;
	browser?: string | null;
	os?: string | null;
	city?: string | null;
	region?: string | null;
	country?: string | null;
	org?: string | null;
	org_type?: string | null;
	hosting?: number | null;
	vpn?: number | null;
	mobile?: number | null;
	me?: number;
	agent?: number;
	secs?: number | null;
	depth?: number | null;
	clicks?: string | null;
	seen?: string | null;
};

const list = (v: unknown) => (Array.isArray(v) && v.length ? JSON.stringify(v) : null);
const regions = new Intl.DisplayNames(['en'], { type: 'region' });

export function fromZaur(all: Record<string, any>[]): Row[] {
	return all.map((v) => ({
		site: 'zaur',
		id: v.id,
		t: Date.parse(v.t),
		host: 'zaur.app',
		path: v.page ?? '/',
		source: v.src,
		ref: v.ref,
		tag: v.tag,
		hash: v.hash,
		tz: v.tz,
		lang: v.lang,
		w: v.w,
		h: v.h,
		screen: v.screen,
		dpr: v.dpr,
		dark: v.dark,
		device: v.device,
		browser: v.browser,
		os: v.os,
		city: v.city,
		region: v.region,
		country: v.country,
		org: v.org,
		org_type: v.orgType,
		hosting: v.hosting,
		vpn: v.vpn,
		mobile: v.mobile,
		me: v.mine ? 1 : 0,
		agent: v.agent ? 1 : 0,
		secs: v.secs,
		depth: v.depth,
		clicks: list(v.clicks),
		seen: v.seen && Object.keys(v.seen).length ? JSON.stringify(v.seen) : null
	}));
}

export function fromYoga(all: Record<string, any>[]): Row[] {
	const site = siteById('yoga')!;
	const rows: Row[] = [];
	for (const v of all) {
		const path = cleanPath(site, v.path);
		if (path === null) continue;
		rows.push({
			site: 'yoga',
			id: v.id,
			t: Date.parse(v.at),
			host: 'szkolyjogi.pl',
			path,
			source: v.source || 'direct',
			ref: v.ref || null,
			tz: v.tz || null,
			lang: v.lang || null,
			w: v.width,
			device: (v.width ?? 2000) < 768 ? 'phone' : 'desktop',
			city: v.city || null,
			country: v.country ? regions.of(v.country) : null,
			secs: v.secs,
			depth: v.depth,
			clicks: list(v.clicks)
		});
	}
	return rows;
}

const COLUMNS = [
	'site', 'id', 't', 'day', 'hour', 'host', 'path', 'source', 'ref', 'tag', 'hash', 'tz', 'lang', 'w', 'h', 'screen', 'dpr', 'dark', 'device', 'browser', 'os',
	'city', 'region', 'country', 'org', 'org_type', 'hosting', 'vpn', 'mobile', 'me', 'agent', 'secs', 'depth', 'clicks', 'seen'
] as const;

const kind = process.argv[2];
if (kind !== 'zaur' && kind !== 'yoga') {
	console.error('usage: import.ts zaur|yoga < lines');
	process.exit(1);
}
const input = await text(process.stdin);
const rows = kind === 'zaur' ? fromZaur(visits(input)) : fromYoga(input.split('\n').filter(Boolean).map((l) => JSON.parse(l)));

const db = getDb();
const insert = db.prepare(`INSERT INTO views (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')}) ON CONFLICT (site, id) DO NOTHING`);
let added = 0;
db.exec('BEGIN');
for (const r of rows) {
	const full: Record<string, unknown> = { ...r, day: dayOf(r.t), hour: hourOf(r.t) };
	added += Number(insert.run(...COLUMNS.map((c) => (full[c] ?? (c === 'me' || c === 'agent' ? 0 : null)) as never)).changes);
}
db.exec('COMMIT');
console.log(`${kind}: ${rows.length} visits read, ${added} added`);
