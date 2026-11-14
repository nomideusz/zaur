/** The order of the sites on the overview: the owner's own, or ranked by one of its figures. */
import { SITES } from './sites';

/** What the rows run by: `own` is the owner's order, the rest are the overview's figure columns. */
export const SORTS = ['own', 'count', 'change', 'today', 'live'] as const;
export type Sort = (typeof SORTS)[number];
export const readSort = (asked: unknown): Sort | null => (SORTS.includes(asked as Sort) ? (asked as Sort) : null);

export interface Arrangement {
	/** Every site, the owner's own order. Starts as the catalogue's. */
	order: string[];
	sort: Sort;
	/** Smallest first. A column starts from its largest. */
	asc: boolean;
}

/** What was asked for, without unknown or repeated sites, and with any new site at the end. */
export function wholeOrder(asked: unknown): string[] {
	const known = SITES.map((s) => s.id);
	const kept = Array.isArray(asked) ? [...new Set(asked)].filter((id): id is string => known.includes(id as string)) : [];
	return [...kept, ...known.filter((id) => !kept.includes(id))];
}

interface Row {
	id: string;
	no: number;
	count: number;
	was: number | null;
	today: number;
	live: number;
}

/** A row's figure in a column, or null where the column shows a dash. A site's first visits outgrow any change. */
const FIGURES: Record<Exclude<Sort, 'own'>, (r: Row) => number | null> = {
	count: (r) => r.count,
	change: (r) => (r.was == null ? null : r.was === 0 ? (r.count ? Infinity : null) : (r.count - r.was) / r.was),
	today: (r) => r.today,
	live: (r) => r.live
};

export function arrange<T extends Row>(rows: T[], how: Arrangement): T[] {
	if (how.sort === 'own') {
		const place = new Map(wholeOrder(how.order).map((id, i) => [id, i]));
		return [...rows].sort((a, b) => (place.get(a.id) ?? 0) - (place.get(b.id) ?? 0));
	}
	const figure = FIGURES[how.sort];
	const turn = how.asc ? 1 : -1;
	return [...rows].sort((a, b) => {
		const x = figure(a);
		const y = figure(b);
		// A dash goes last whichever way the column runs, and a tie falls back to the ranking.
		if (x == null || y == null) {
			if (x != y) return x == null ? 1 : -1;
		} else if (x !== y) return turn * (x < y ? -1 : 1);
		return b.count - a.count || a.no - b.no;
	});
}

/** The list with one entry taken out and put back at another place. */
export function moved<T>(list: T[], from: number, to: number): T[] {
	const next = [...list];
	next.splice(to, 0, ...next.splice(from, 1));
	return next;
}
