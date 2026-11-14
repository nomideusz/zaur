/**
 * The numbers: one period of one audience, of one site or of all of them. `who`
 * is others, mine, all (the two together) or bots, which are in neither; a tag
 * reads its visits from all time.
 */
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { siteById, SITES } from '#lib/sites';
import { SOURCES } from '#lib/sources';
import { DAYS, FILTERS, VISITS_PER_PAGE, type Filter, type Filters, type VisitOrder, type VisitSort, type Who } from '#lib/view';
import { dayOf, hourOf } from './ingest';

export { DAYS, type Who };
export type Rows = [string, number][];

/** Hours in one reading of a site's line, so a line holds about 180 points whatever the period. */
export const READING_HOURS: Record<number, number> = { 1: 1, 7: 1, 30: 4, 90: 12 };

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
	/** Why the rules took it for a program (bots.ts), or null. */
	bot: string | null;
	/** The same browser back within its visit: not a visit of its own. */
	again: number | null;
	secs: number | null;
	depth: number | null;
	clicks: string[] | null;
	seen: Record<string, number> | null;
}

export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

type Where = { sql: string; params: SQLInputValue[] };
// Bots are judged among the others only: the owner's views are never a program's.
const WHO_SQL: Record<Who | 'any', string> = { others: 'me = 0 AND bot IS NULL', mine: 'me = 1', all: 'bot IS NULL', bots: 'bot IS NOT NULL', any: '' };
// A visit is an arrival from outside the site, unless the same browser was there
// within the half hour (visits.ts): the headline everywhere. Pages opened, which a
// reader's every click adds to, are the detail under it.
const ENTRY = `source <> 'internal' AND again IS NULL`;
const COUNTS = `COALESCE(SUM(me = 1 AND ${ENTRY}), 0) AS mine, COALESCE(SUM(me = 0 AND bot IS NULL AND ${ENTRY}), 0) AS others, COALESCE(SUM(bot IS NOT NULL AND ${ENTRY}), 0) AS bots`;
type Counts = { mine: number; others: number; bots: number };
function scope(site: string, who: Who | 'any', extra: Where): Where {
	const parts = [extra.sql];
	const params = [...extra.params];
	if (site !== 'all') {
		parts.push('site = ?');
		params.push(site);
	}
	parts.push(WHO_SQL[who]);
	return { sql: parts.filter(Boolean).join(' AND '), params };
}

/** What a list's rows are named by, where that is more than a column: the same words a filter is matched against. */
const PLACE = `CASE WHEN city IS NOT NULL THEN city || ', ' || COALESCE(country, '') ELSE COALESCE(country, REPLACE(SUBSTR(tz, INSTR(tz, '/') + 1), '_', ' ')) END`;
const LANG = `CASE WHEN INSTR(lang, '-') THEN SUBSTR(lang, 1, INSTR(lang, '-') - 1) ELSE lang END`;
const SYSTEM = `os || ' · ' || browser`;
const SCREEN = `device || ' ' || REPLACE(screen, 'x', '×')`;
// `views.path`, since the lists read out of a visit's JSON join a table with a `path` of its own.
const FILTER_SQL: Record<Exclude<Filter, 'under'>, string> = { path: 'views.path', source: 'source', ref: 'ref', place: PLACE, network: 'org', lang: LANG, system: SYSTEM, screen: SCREEN };

/** The page at a path and every page under it. A path's own `%` and `_` are only themselves. */
function underPath(path: string): Where {
	const base = path.replace(/\/+$/, '');
	return { sql: `(views.path = ? OR views.path LIKE ? ESCAPE '\\')`, params: [base || '/', `${base.replace(/[\\%_]/g, '\\$&')}/%`] };
}

/** Only the visits every filter names. */
function narrowed(filters: Filters): Where {
	const set = (Object.keys(FILTERS) as Filter[]).filter((k) => filters[k]);
	return set.map((k): Where => (k === 'under' ? underPath(filters[k]!) : { sql: `(${FILTER_SQL[k]}) = ?`, params: [filters[k]!] })).reduce(both, { sql: '', params: [] });
}
function both(a: Where, b: Where): Where {
	return { sql: [a.sql, b.sql].filter(Boolean).join(' AND '), params: [...a.params, ...b.params] };
}

/**
 * What a visit log's column is read by, so the rows run as the words on screen do.
 * These mirror `device` in format.ts and `from` in VisitTable.svelte.
 */
const quote = (text: string) => `'${text.replace(/'/g, "''")}'`;
const named = (column: string, names: [string, string][]) => `CASE ${column} ${names.map(([k, name]) => `WHEN ${quote(k)} THEN ${quote(name)}`).join(' ')} ELSE ${column} END`;
const VISIT_ORDER: Record<VisitSort, string[]> = {
	when: ['t'],
	site: [named('site', SITES.map((s) => [s.id, s.name]))],
	page: ['path'],
	from: [`COALESCE(NULLIF(tag, ''), NULLIF(ref, ''), CASE WHEN source = 'social' THEN NULLIF(browser, '') END, ${named('source', Object.entries(SOURCES))})`],
	where: [PLACE],
	network: ['org'],
	device: [`CASE WHEN device = 'phone' OR COALESCE(w, 2000) < 768 THEN 'phone' WHEN COALESCE(w, 2000) < 1100 THEN 'tablet' ELSE 'desktop' END`, 'w', 'h'],
	time: ['secs'],
	read: ['depth']
};
/** A visit with nothing in the column goes last whichever way it runs, and the latest leads among equals. */
function visitOrder(o: Pick<VisitOrder, 'by' | 'asc'>): string {
	const [first, ...rest] = VISIT_ORDER[o.by];
	const dir = o.asc ? 'ASC' : 'DESC';
	return [`COALESCE((${first}) = '', 1)`, ...[first, ...rest].map((k) => `${k} COLLATE NOCASE ${dir}`), 't DESC'].join(', ');
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

export interface StackRow {
	label: string;
	/** The last day of a line that spans several. */
	to: string | null;
	hours: number[];
	n: number;
}

export function report(db: DatabaseSync, opts: { site: string; days?: number; who?: Who; tag?: string | null; filters?: Filters; visits?: VisitOrder; now?: number }) {
	const { site, days = 30, who = 'others', tag = null, filters = {}, visits = { by: 'when', asc: false, page: 1 }, now = Date.now() } = opts;
	const { all, one } = reader(db);
	const today = dayOf(now);
	const from = addDays(today, 1 - days);
	const prevFrom = addDays(from, -days);
	const narrow = narrowed(filters);
	const period = both(tag ? { sql: 'tag = ?', params: [tag] } : { sql: 'day >= ?', params: [from] }, narrow);
	const w = scope(site, who, period);

	const totals = one<{ views: number; entries: number; depth: number | null; clicked: number; phones: number; dark: number; darkKnown: number; business: number }>(
		`SELECT COUNT(*) AS views,
			COALESCE(SUM(${ENTRY}), 0) AS entries,
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

	const everyone = scope(site, 'any', period);
	const counts = one<Counts>(`SELECT ${COUNTS} FROM views WHERE ${everyone.sql}`, everyone.params);

	// Only a previous period the log saw whole is worth a comparison.
	const siteOnly = scope(site, 'any', { sql: '', params: [] });
	const first = one<{ day: string | null }>(`SELECT MIN(day) AS day FROM views ${siteOnly.sql ? `WHERE ${siteOnly.sql}` : ''}`, siteOnly.params).day;
	let was: number | null = null;
	if (!tag && first && first <= prevFrom) {
		const prev = scope(site, who, both({ sql: 'day >= ? AND day < ?', params: [prevFrom, from] }, narrow));
		was = one<{ n: number }>(`SELECT COUNT(*) AS n FROM views WHERE ${prev.sql} AND ${ENTRY}`, prev.params).n;
	}

	// Visits: today by the hour, longer periods by the day.
	const bars: { label: string; n: number }[] = [];
	if (!tag) {
		if (days === 1) {
			const byHour = new Map(all<{ k: number; n: number }>(`SELECT hour AS k, COUNT(*) AS n FROM views WHERE ${w.sql} AND ${ENTRY} GROUP BY 1`, w.params).map((r) => [r.k, r.n]));
			for (let h = 0; h <= hourOf(now); h++) bars.push({ label: `${String(h).padStart(2, '0')}:00`, n: byHour.get(h) ?? 0 });
		} else {
			const byDay = new Map(all<{ k: string; n: number }>(`SELECT day AS k, COUNT(*) AS n FROM views WHERE ${w.sql} AND ${ENTRY} GROUP BY 1`, w.params).map((r) => [r.k, r.n]));
			for (let i = 0; i < days; i++) {
				const d = addDays(from, i);
				bars.push({ label: d, n: byDay.get(d) ?? 0 });
			}
		}
	}

	// Visits, one line a day through its 24 hours; a week a line over 90 days, and a tag's
	// last 30 days with visits. The newest is last, and today's stops at this hour.
	const cells = all<{ day: string; hour: number; n: number }>(`SELECT day, hour, COUNT(*) AS n FROM views WHERE ${w.sql} AND ${ENTRY} GROUP BY 1, 2`, w.params);
	const byDay = new Map<string, number[]>();
	for (const c of cells) {
		const hours = byDay.get(c.day) ?? Array<number>(24).fill(0);
		if (c.hour >= 0 && c.hour < 24) hours[c.hour] += c.n;
		byDay.set(c.day, hours);
	}
	const blank = () => Array<number>(24).fill(0);
	const dayList = tag
		? [...byDay.keys()].sort().slice(-30)
		: Array.from({ length: days }, (_, i) => addDays(from, i));
	const stackRows: StackRow[] = [];
	const perLine = !tag && days === 90 ? 7 : 1;
	for (let i = 0; i < dayList.length; i += perLine) {
		const span = dayList.slice(i, i + perLine);
		const hours = blank();
		for (const d of span) (byDay.get(d) ?? []).forEach((n, h) => (hours[h] += n));
		const isToday = span.at(-1) === today;
		stackRows.push({
			label: span[0],
			to: perLine > 1 ? span.at(-1)! : null,
			hours: isToday && perLine === 1 ? hours.slice(0, hourOf(now) + 1) : hours,
			n: hours.reduce((a, b) => a + b, 0)
		});
	}
	const stack = { rows: stackRows, peak: Math.max(1, ...stackRows.flatMap((r) => r.hours)) };

	const pages = rows(db, 'path', w, 25).map(([path, n]) => {
		const onPage: Where = { sql: `${w.sql} AND path = ?`, params: [...w.params, path] };
		return { path, n, median: median(db, onPage) };
	});

	const everyTag = scope(site, who, both({ sql: 'tag IS NOT NULL', params: [] }, narrow));
	// A site's parts, each by the pages under its path. A page under none of them is in no row.
	const parts = (siteById(site)?.parts?.list ?? [])
		.map((part): [string, number] => {
			const within = both(w, underPath(part.path));
			return [part.path, one<{ n: number }>(`SELECT COUNT(*) AS n FROM views WHERE ${within.sql}`, within.params).n];
		})
		.filter(([, n]) => n > 0)
		.sort((a, b) => b[1] - a[1]);
	// A page past the last one shows the last one.
	const page = Math.max(1, Math.min(visits.page, Math.ceil(totals.views / VISITS_PER_PAGE)));

	return {
		site,
		days,
		who,
		tag,
		filters,
		from,
		today,
		views: totals.views,
		entries: totals.entries,
		mineCount: counts.mine,
		othersCount: counts.others,
		botsCount: counts.bots,
		was,
		median: median(db, w),
		depth: totals.depth,
		clicked: pct(totals.clicked),
		phones: pct(totals.phones),
		dark: totals.darkKnown ? Math.round((100 * totals.dark) / totals.darkKnown) : null,
		business: totals.business,
		bars,
		stack,
		pages,
		sites: site === 'all' ? rows(db, 'site', w, 20) : [],
		parts,
		sources: rows(db, 'source', { sql: `${w.sql} AND ${ENTRY}`, params: w.params }, 12),
		refs: rows(db, 'ref', { sql: `${w.sql} AND ${ENTRY}`, params: w.params }, 12),
		places: all<{ k: string; n: number }>(`SELECT ${PLACE} AS k, COUNT(*) AS n FROM views WHERE ${w.sql} GROUP BY 1 HAVING k IS NOT NULL ORDER BY 2 DESC LIMIT 12`, w.params).map((r): [string, number] => [r.k, r.n]),
		networks: rows(db, 'org', w, 12),
		langs: all<{ k: string; n: number }>(`SELECT ${LANG} AS k, COUNT(*) AS n FROM views WHERE ${w.sql} AND lang IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 8`, w.params).map((r): [string, number] => [r.k, r.n]),
		systems: all<{ k: string; n: number }>(`SELECT ${SYSTEM} AS k, COUNT(*) AS n FROM views WHERE ${w.sql} AND os IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10`, w.params).map((r): [string, number] => [r.k, r.n]),
		screens: all<{ k: string; n: number }>(`SELECT ${SCREEN} AS k, COUNT(*) AS n FROM views WHERE ${w.sql} AND screen IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10`, w.params).map((r): [string, number] => [r.k, r.n]),
		// What was opened, each target once per visit.
		opened: all<{ k: string; n: number }>(`SELECT j.value AS k, COUNT(DISTINCT views.site || views.id) AS n FROM views, json_each(views.clicks) j WHERE ${w.sql} GROUP BY 1 ORDER BY 2 DESC LIMIT 15`, w.params).map((r): [string, number] => [r.k, r.n]),
		// Parts of a page read for at least 3 seconds, once per visit.
		read: all<{ k: string; n: number }>(`SELECT j.key AS k, COUNT(DISTINCT views.site || views.id) AS n FROM views, json_each(views.seen) j WHERE ${w.sql} AND j.value >= 3 GROUP BY 1 ORDER BY 2 DESC LIMIT 15`, w.params).map((r): [string, number] => [r.k, r.n]),
		tags: all<{ k: string; n: number; last: number }>(`SELECT tag AS k, COUNT(*) AS n, MAX(t) AS last FROM views WHERE ${everyTag.sql} GROUP BY 1 ORDER BY 3 DESC LIMIT 30`, everyTag.params),
		// One page of the visit log, in the order asked for.
		page,
		recent: all<Record<string, unknown>>(`SELECT * FROM views WHERE ${w.sql} ORDER BY ${visitOrder(visits)} LIMIT ${VISITS_PER_PAGE} OFFSET ${(page - 1) * VISITS_PER_PAGE}`, w.params).map(asVisit)
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

/** One line a site, for the first page, on one scale across them. */
export function overview(db: DatabaseSync, now = Date.now(), opts: { who?: Who; days?: number } = {}) {
	const { who = 'others', days = 30 } = opts;
	const { all, one } = reader(db);
	const me = WHO_SQL[who];
	const today = dayOf(now);
	const from = addDays(today, 1 - days);
	const prevFrom = addDays(from, -days);
	const weekFrom = addDays(today, -6);
	const monthFrom = addDays(today, -29);
	const earliest = [prevFrom, monthFrom].sort()[0];

	const perDay = all<{ site: string; day: string; n: number }>(`SELECT site, day, COUNT(*) AS n FROM views WHERE ${me} AND ${ENTRY} AND day >= ? GROUP BY 1, 2`, [earliest]);
	const recent = new Map(all<{ site: string; n: number }>(`SELECT site, COUNT(*) AS n FROM views WHERE ${me} AND t > ? GROUP BY 1`, [now - 5 * 60_000]).map((r) => [r.site, r.n]));
	const firsts = new Map(all<{ site: string; day: string }>(`SELECT site, MIN(day) AS day FROM views GROUP BY 1`).map((r) => [r.site, r.day]));

	// The readings of each line, and the one peak they all share.
	const step = READING_HOURS[days] ?? 4;
	const perDayReadings = 24 / step;
	const slots = days * perDayReadings;
	const filled = (days - 1) * perDayReadings + Math.floor(hourOf(now) / step) + 1;
	const dayIndex = new Map(Array.from({ length: days }, (_, i) => [addDays(from, i), i] as const));
	const pulses = new Map<string, number[]>();
	for (const r of all<{ site: string; day: string; b: number; n: number }>(`SELECT site, day, hour / ${step} AS b, COUNT(*) AS n FROM views WHERE ${me} AND ${ENTRY} AND day >= ? GROUP BY 1, 2, 3`, [from])) {
		const d = dayIndex.get(r.day);
		if (d === undefined) continue;
		const line = pulses.get(r.site) ?? Array<number>(filled).fill(0);
		const i = d * perDayReadings + r.b;
		if (i < filled) line[i] = r.n;
		pulses.set(r.site, line);
	}
	const peak = Math.max(1, ...[...pulses.values()].flat());

	// The same counts as columns: one a day, on a peak of their own. Today alone is its hours.
	const dailies = new Map<string, number[]>();
	for (const r of perDay) {
		const d = dayIndex.get(r.day);
		if (d === undefined) continue;
		const row = dailies.get(r.site) ?? Array<number>(days).fill(0);
		row[d] = r.n;
		dailies.set(r.site, row);
	}
	const columnSlots = days === 1 ? slots : days;
	const columnPeak = days === 1 ? peak : Math.max(1, ...[...dailies.values()].flat());

	const sources = new Map<string, Rows>();
	for (const r of all<{ site: string; source: string; n: number }>(`SELECT site, source, COUNT(*) AS n FROM views WHERE ${me} AND day >= ? AND ${ENTRY} GROUP BY 1, 2`, [from])) {
		sources.set(r.site, [...(sources.get(r.site) ?? []), [r.source, r.n]]);
	}
	const counts = { ...one<Counts>(`SELECT ${COUNTS} FROM views WHERE day >= ?`, [from]) };

	const line = (site: string) => {
		const own = perDay.filter((r) => r.site === site);
		const sum = (test: (d: string) => boolean) => own.filter((r) => test(r.day)).reduce((a, r) => a + r.n, 0);
		const first = firsts.get(site);
		return {
			live: recent.get(site) ?? 0,
			today: sum((d) => d === today),
			week: sum((d) => d >= weekFrom),
			month: sum((d) => d >= monthFrom),
			count: sum((d) => d >= from),
			was: first && first <= prevFrom ? sum((d) => d >= prevFrom && d < from) : null,
			pulse: pulses.get(site) ?? Array<number>(filled).fill(0),
			columns: days === 1 ? (pulses.get(site) ?? Array<number>(filled).fill(0)) : (dailies.get(site) ?? Array<number>(days).fill(0)),
			sources: sources.get(site) ?? []
		};
	};
	return Object.assign(line, { peak, step, slots, filled, from, today, counts, columnSlots, columnPeak });
}
