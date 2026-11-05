/**
 * Brings the visits the old counters already hold into this store, once, before
 * the first boot: JSON lines on stdin, the store named by STATS_DB. Re-running
 * changes nothing, as a view is known by its id.
 *
 *   ssh radio 'docker exec $(docker ps -qf name=yoga-pg) psql -U postgres -d yoga -Atc \
 *     "select row_to_json(s) from site_visits s order by at"' \
 *     | STATS_DB=./data/seed.db node --import tsx scripts/import.ts yoga
 *
 * zaur.app's history came in the same way before its own counter was removed; its
 * reader went with it, so git history has that branch.
 */
import { text } from 'node:stream/consumers';
import { getDb } from '#lib/server/db';
import { dayOf, hourOf } from '#lib/server/ingest';
import { cleanPath, siteById } from '#lib/sites';

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

if (process.argv[2] !== 'yoga') {
	console.error('usage: import.ts yoga < lines');
	process.exit(1);
}
const input = await text(process.stdin);
const rows = fromYoga(input.split('\n').filter(Boolean).map((l) => JSON.parse(l)));

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
