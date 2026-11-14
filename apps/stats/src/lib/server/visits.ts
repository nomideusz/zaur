/**
 * One visit is one browser's time on a site: a browser that comes back from outside
 * within half an hour of its last page is still on the same visit, so the arrival is
 * marked `again` and counts no more. Which browser it is comes from its address and
 * user agent, held in memory as a hash for the half hour and never written; rows from
 * before (or the half hour after a restart) are matched by what they hold instead.
 */
import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

export const VISIT_MS = 30 * 60_000;

/** What a row holds that tells one browser from another, near enough within a half hour on one site. */
export interface Likeness {
	tz: string | null;
	lang: string | null;
	screen: string | null;
	w: number | null;
	h: number | null;
	dpr: number | null;
	browser: string | null;
	os: string | null;
	org: string | null;
	city: string | null;
	device: string | null;
	/** The owner and anyone else are never one browser. */
	me: number;
}
const LIKENESS = ['tz', 'lang', 'screen', 'w', 'h', 'dpr', 'browser', 'os', 'org', 'city', 'device', 'me'] as const;
// Imported rows know no browser and too little else to tell anyone apart.
const knowable = (v: Likeness) => v.browser != null && v.tz != null;
const likeness = (v: Likeness) => JSON.stringify(LIKENESS.map((k) => v[k]));
// A page's end beacon says how long it stayed open: the browser was there until then.
const lastAt = (t: number, secs: number | null) => t + (secs ?? 0) * 1000;

const seen = new Map<string, number>();
/** Since when memory holds every browser's last half hour: a test may move it back. */
export const memory = { since: Date.now() };

/**
 * Notes a browser's page and says whether a page from outside is a return within the
 * same visit. Without an address (tests, a lost header) only what the row holds can tell.
 */
export function again(db: DatabaseSync, site: string, who: { ip?: string; ua: string }, v: Likeness, internal: boolean, now: number): boolean {
	const key = who.ip ? createHash('sha256').update(`${site}\n${who.ip}\n${who.ua}`).digest('base64url') : null;
	const prev = key ? seen.get(key) : undefined;
	if (key) {
		if (seen.size > 50_000) for (const [k, t] of seen) if (now - t > VISIT_MS) seen.delete(k);
		seen.set(key, now);
	}
	if (internal) return false;
	if (prev !== undefined) return now - prev < VISIT_MS;
	// Memory only remembers since the last boot.
	if (key && now - memory.since > VISIT_MS) return false;
	return knowable(v) && alike(db, site, v, now);
}

/** Extends a browser's visit to when it left its page. */
export function stayed(site: string, who: { ip?: string; ua: string }, now: number): void {
	if (!who.ip) return;
	const key = createHash('sha256').update(`${site}\n${who.ip}\n${who.ua}`).digest('base64url');
	if (seen.has(key)) seen.set(key, now);
}

function alike(db: DatabaseSync, site: string, v: Likeness, now: number): boolean {
	const rows = db
		.prepare(`SELECT t, secs, ${LIKENESS.join(', ')} FROM views WHERE site = ? AND t > ? AND t <= ? ORDER BY t DESC LIMIT 500`)
		.all(site, now - 3 * VISIT_MS, now) as unknown as Array<Likeness & { t: number; secs: number | null }>;
	const mine = likeness(v);
	return rows.some((r) => likeness(r) === mine && now - lastAt(r.t, r.secs) < VISIT_MS);
}

/** Marks every row's returns by likeness, for a store from before `again`. */
export function markAgainAll(db: DatabaseSync): void {
	const rows = db.prepare(`SELECT site, id, t, secs, source, ${LIKENESS.join(', ')} FROM views ORDER BY site, t`).all() as unknown as Array<
		Likeness & { site: string; id: string; t: number; secs: number | null; source: string }
	>;
	const set = db.prepare('UPDATE views SET again = 1 WHERE site = ? AND id = ?');
	const last = new Map<string, number>();
	db.exec('BEGIN');
	try {
		for (const r of rows) {
			if (!knowable(r)) continue;
			const key = `${r.site}\n${likeness(r)}`;
			const prev = last.get(key);
			if (r.source !== 'internal' && prev !== undefined && r.t - prev < VISIT_MS) set.run(r.site, r.id);
			last.set(key, Math.max(prev ?? 0, lastAt(r.t, r.secs)));
		}
		db.exec('COMMIT');
	} catch (err) {
		db.exec('ROLLBACK');
		throw err;
	}
}
