/**
 * The numbers: one period of one audience, of one site or of all of them. `who`
 * is others, mine or all; a tag reads its visits from all time.
 */
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { dayOf, hourOf } from './ingest';

export type Who = 'others' | 'mine' | 'all';
export const DAYS = [1, 7, 30, 90] as const;
export type Rows = [string, number][];

export interface VisitRow {
	site: string;
	id: string;
	t: number;
	host: string | null;
	path: string;
	source: string;
	ref: string | null;
	tag: string | null;
	hash: string | null;
	tz: string | null;
	lang: string | null;
	w: number | null;
	h: number | null;
	screen: string | null;
	dpr: number | null;
	dark: number | null;
	device: string | null;
	browser: string | null;
	os: string | null;
	city: string | null;
	region: string | null;
	country: string | null;
	org: string | null;
	org_type: string | null;
	hosting: number | null;
	vpn: number | null;
	mobile: number | null;
	me: number;
	agent: number;
	secs: number | null;
	depth: number | null;
	clicks: string[] | null;
	seen: Record<string, number> | null;
}

export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

type Where = { sql: string; params: SQLInputValue[] };
function scope(site: string, who: Who, extra: Where): Where {
	const parts = [extra.sql];
	const params = [...extra.params];
	if (site !== 'all') {
		parts.push('site = ?');
		params.push(site);
	}
	if (who !== 'all') parts.push(who === 'mine' ? 'me = 1' : 'me = 0');
	return { sql: parts.filter(Boolean).join(' AND '), params };
}

const reader = (db: DatabaseSync) => ({
	all: <T>(sql: string, params: SQLInputValue[] = []) => db.prepare(sql).all(...params) as T[],
	one: <T>(sql: string, params: SQLInputValue[] = []) => db.prepare(sql).get(...params) as T
});

function rows(db: DatabaseSync, column: string, w: Where, limit: number): Rows {
	return reader(db)
		.all<{ k: string; n: number }>(`SELECT ${column} AS k, COUNT(*) AS n FROM views WHERE ${w.sql} AND ${column} IS NOT NULL AND ${column} <> '' GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT ${limit}`, w.params)
		.map((r) => [r.k, r.n]);
}

function median(db: DatabaseSync, w: Where): number | null {
	const { one } = reader(db);
	const { n } = one<{ n: number }>(`SELECT COUNT(secs) AS n FROM views WHERE ${w.sql}`, w.params);
	if (!n) return null;
	return one<{ secs: number }>(`SELECT secs FROM views WHERE ${w.sql} AND secs IS NOT NULL ORDER BY secs LIMIT 1 OFFSET ?`, [...w.params, Math.floor((n - 1) / 2)]).secs;
}

export function asVisit(r: Record<string, unknown>): VisitRow {
	return {
		...(r as unknown as VisitRow),
		clicks: r.clicks ? (JSON.parse(r.clicks as string) as string[]) : null,
		seen: r.seen ? (JSON.parse(r.seen as string) as Record<string, number>) : null
	};
}

export function report(db: DatabaseSync, opts: { site: string; days?: number; who?: Who; tag?: string | null; now?: number }) {
	const { site, days = 30, who = 'others', tag = null, now = Date.now() } = opts;
	const { all, one } = reader(db);
	const today = dayOf(now);
	const from = addDays(today, 1 - days);
	const prevFrom = addDays(from, -days);
	const period: Where = tag ? { sql: 'tag = ?', params: [tag] } : { sql: 'day >= ?', params: [from] };
	const w = scope(site, who, period);

	const totals = one<{ views: number; entries: number; depth: number | null; clicked: number; phones: number; dark: number; darkKnown: number; business: number }>(
		`SELECT COUNT(*) AS views,
			COALESCE(SUM(source <> 'internal'), 0) AS entries,
			CAST(ROUND(AVG(depth)) AS INTEGER) AS depth,
			COALESCE(SUM(clicks IS NOT NULL), 0) AS clicked,
			COALESCE(SUM(device = 'phone'), 0) AS phones,
			COALESCE(SUM(dark = 1), 0) AS dark,
			COUNT(dark) AS darkKnown,
			COALESCE(SUM(org_type = 'business'), 0) AS business
		FROM views WHERE ${w.sql}`,
		w.params
	);
	const pct = (n: number) => (totals.views ? Math.round((100 * n) / totals.views) : 0);

	const everyone = scope(site, 'all', period);
	const counts = one<{ mine: number; others: number }>(`SELECT COALESCE(SUM(me = 1), 0) AS mine, COALESCE(SUM(me = 0), 0) AS others FROM views WHERE ${everyone.sql}`, everyone.params);

	// Only a previous period the log saw whole is worth a comparison.
	const siteOnly = scope(site, 'all', { sql: '', params: [] });
	const first = one<{ day: string | null }>(`SELECT MIN(day) AS day FROM views ${siteOnly.sql ? `WHERE ${siteOnly.sql}` : ''}`, siteOnly.params).day;
	let was: number | null = null;
	if (!tag && first && first <= prevFrom) {
		const prev = scope(site, who, { sql: 'day >= ? AND day < ?', params: [prevFrom, from] });
		was = one<{ n: number }>(`SELECT COUNT(*) AS n FROM views WHERE ${prev.sql}`, prev.params).n;
	}

	// Today by the hour, longer periods by the day.
	const bars: { label: string; n: number }[] = [];
	if (!tag) {
		if (days === 1) {
			const byHour = new Map(all<{ k: number; n: number }>(`SELECT hour AS k, COUNT(*) AS n FROM views WHERE ${w.sql} GROUP BY 1`, w.params).map((r) => [r.k, r.n]));
			for (let h = 0; h <= hourOf(now); h++) bars.push({ label: `${String(h).padStart(2, '0')}:00`, n: byHour.get(h) ?? 0 });
		} else {
			const byDay = new Map(all<{ k: string; n: number }>(`SELECT day AS k, COUNT(*) AS n FROM views WHERE ${w.sql} GROUP BY 1`, w.params).map((r) => [r.k, r.n]));
			for (let i = 0; i < days; i++) {
				const d = addDays(from, i);
				bars.push({ label: d, n: byDay.get(d) ?? 0 });
			}
		}
	}

	const pages = rows(db, 'path', w, 25).map(([path, n]) => {
		const onPage: Where = { sql: `${w.sql} AND path = ?`, params: [...w.params, path] };
		return { path, n, median: median(db, onPage) };
	});

	return {
		site,
		days,
		who,
		tag,
		from,
		today,
		views: totals.views,
		entries: totals.entries,
		mineCount: counts.mine,
		othersCount: counts.others,
		was,
		median: median(db, w),
		depth: totals.depth,
		clicked: pct(totals.clicked),
		phones: pct(totals.phones),
		dark: totals.darkKnown ? Math.round((100 * totals.dark) / totals.darkKnown) : null,
		business: totals.business,
		bars,
		pages,
		sites: site === 'all' ? rows(db, 'site', w, 20) : [],
		sources: rows(db, 'source', w, 12),
		refs: rows(db, 'ref', { sql: `${w.sql} AND source <> 'internal'`, params: w.params }, 12),
		places: all<{ k: string; n: number }>(
			`SELECT CASE WHEN city IS NOT NULL THEN city || ', ' || COALESCE(country, '') ELSE COALESCE(country, REPLACE(SUBSTR(tz, INSTR(tz, '/') + 1), '_', ' ')) END AS k, COUNT(*) AS n
			FROM views WHERE ${w.sql} GROUP BY 1 HAVING k IS NOT NULL ORDER BY 2 DESC LIMIT 12`,
			w.params
		).map((r): [string, number] => [r.k, r.n]),
		networks: rows(db, 'org', w, 12),
		langs: all<{ k: string; n: number }>(
			`SELECT CASE WHEN INSTR(lang, '-') THEN SUBSTR(lang, 1, INSTR(lang, '-') - 1) ELSE lang END AS k, COUNT(*) AS n FROM views WHERE ${w.sql} AND lang IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
			w.params
		).map((r): [string, number] => [r.k, r.n]),
		systems: all<{ k: string; n: number }>(`SELECT os || ' · ' || browser AS k, COUNT(*) AS n FROM views WHERE ${w.sql} AND os IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10`, w.params).map((r): [string, number] => [r.k, r.n]),
		screens: all<{ k: string; n: number }>(`SELECT device || ' ' || REPLACE(screen, 'x', '×') AS k, COUNT(*) AS n FROM views WHERE ${w.sql} AND screen IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10`, w.params).map((r): [string, number] => [r.k, r.n]),
		// What was opened, each target once per visit.
		opened: all<{ k: string; n: number }>(`SELECT j.value AS k, COUNT(DISTINCT views.site || views.id) AS n FROM views, json_each(views.clicks) j WHERE ${w.sql} GROUP BY 1 ORDER BY 2 DESC LIMIT 15`, w.params).map((r): [string, number] => [r.k, r.n]),
		// Parts of a page read for at least 3 seconds, once per visit.
		read: all<{ k: string; n: number }>(`SELECT j.key AS k, COUNT(DISTINCT views.site || views.id) AS n FROM views, json_each(views.seen) j WHERE ${w.sql} AND j.value >= 3 GROUP BY 1 ORDER BY 2 DESC LIMIT 15`, w.params).map((r): [string, number] => [r.k, r.n]),
		tags: all<{ k: string; n: number; last: number }>(`SELECT tag AS k, COUNT(*) AS n, MAX(t) AS last FROM views WHERE ${scope(site, who, { sql: 'tag IS NOT NULL', params: [] }).sql} GROUP BY 1 ORDER BY 3 DESC LIMIT 30`, scope(site, who, { sql: 'tag IS NOT NULL', params: [] }).params),
		recent: all<Record<string, unknown>>(`SELECT * FROM views WHERE ${w.sql} ORDER BY t DESC LIMIT 100`, w.params).map(asVisit)
	};
}
export type Report = ReturnType<typeof report>;

const MINUTES = 60;
const HOURS = 24;

/** The last hour and the last day, as they land. */
export function liveSnapshot(db: DatabaseSync, opts: { site: string; who?: Who; now?: number }) {
	const { site, who = 'others', now = Date.now() } = opts;
	const { all } = reader(db);
	const nowMinute = Math.floor(now / 60_000);
	const nowHour = Math.floor(now / 3_600_000);
	const hourAgo = (nowMinute - MINUTES + 1) * 60_000;
	const dayAgo = (nowHour - HOURS + 1) * 3_600_000;

	const w = scope(site, who, { sql: 't >= ?', params: [dayAgo] });
	const minutes = Array<number>(MINUTES).fill(0);
	const hours = Array<number>(HOURS).fill(0);
	for (const r of all<{ m: number; n: number }>(`SELECT t / 60000 AS m, COUNT(*) AS n FROM views WHERE ${w.sql} AND t >= ? GROUP BY 1`, [...w.params, hourAgo])) {
		const i = MINUTES - 1 - (nowMinute - Math.floor(r.m));
		if (i >= 0 && i < MINUTES) minutes[i] = r.n;
	}
	for (const r of all<{ h: number; n: number }>(`SELECT t / 3600000 AS h, COUNT(*) AS n FROM views WHERE ${w.sql} GROUP BY 1`, w.params)) {
		const i = HOURS - 1 - (nowHour - Math.floor(r.h));
		if (i >= 0 && i < HOURS) hours[i] = r.n;
	}
	const pages = all<{ site: string; path: string; n: number }>(`SELECT site, path, COUNT(*) AS n FROM views WHERE ${w.sql} GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 15`, w.params).map((p) => ({
		...p,
		median: median(db, { sql: `${w.sql} AND site = ? AND path = ?`, params: [...w.params, p.site, p.path] })
	}));
	const everywhere = scope(site, who, { sql: '1 = 1', params: [] });
	const recent = all<Record<string, unknown>>(`SELECT * FROM views WHERE ${everywhere.sql} ORDER BY t DESC LIMIT 30`, everywhere.params).map(asVisit);
	return { at: now, minutes, hours, pages, recent };
}
export type Live = ReturnType<typeof liveSnapshot>;

/** One line a site, for the first page. */
export function overview(db: DatabaseSync, now = Date.now()) {
	const { all } = reader(db);
	const today = dayOf(now);
	const trendFrom = addDays(today, -29);
	const prevFrom = addDays(trendFrom, -30);
	const perDay = all<{ site: string; day: string; n: number }>(`SELECT site, day, COUNT(*) AS n FROM views WHERE me = 0 AND day >= ? GROUP BY 1, 2`, [prevFrom]);
	const recent = new Map(all<{ site: string; n: number }>(`SELECT site, COUNT(*) AS n FROM views WHERE me = 0 AND t > ? GROUP BY 1`, [now - 5 * 60_000]).map((r) => [r.site, r.n]));
	const firsts = new Map(all<{ site: string; day: string }>(`SELECT site, MIN(day) AS day FROM views GROUP BY 1`).map((r) => [r.site, r.day]));
	const week = addDays(today, -6);
	const days = Array.from({ length: 30 }, (_, i) => addDays(trendFrom, i));

	return (site: string) => {
		const mine = perDay.filter((r) => r.site === site);
		const on = new Map(mine.map((r) => [r.day, r.n]));
		const sum = (test: (d: string) => boolean) => mine.filter((r) => test(r.day)).reduce((a, r) => a + r.n, 0);
		const first = firsts.get(site);
		return {
			live: recent.get(site) ?? 0,
			today: on.get(today) ?? 0,
			week: sum((d) => d >= week),
			month: sum((d) => d >= trendFrom),
			was: first && first <= prevFrom ? sum((d) => d < trendFrom) : null,
			trend: days.map((d) => ({ label: d, n: on.get(d) ?? 0 }))
		};
	};
}
