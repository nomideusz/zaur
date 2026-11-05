/** The order of the sites on the overview: ranked by the period's count, or the owner's own. */
import { SITES } from './sites';

export interface Arrangement {
	/** Every site, the owner's own order. Starts as the catalogue's. */
	order: string[];
	ranked: boolean;
}

/** What was asked for, without unknown or repeated sites, and with any new site at the end. */
export function wholeOrder(asked: unknown): string[] {
	const known = SITES.map((s) => s.id);
	const kept = Array.isArray(asked) ? [...new Set(asked)].filter((id): id is string => known.includes(id as string)) : [];
	return [...kept, ...known.filter((id) => !kept.includes(id))];
}

export function arrange<T extends { id: string; no: number; count: number }>(rows: T[], how: Arrangement): T[] {
	if (how.ranked) return [...rows].sort((a, b) => b.count - a.count || a.no - b.no);
	const place = new Map(wholeOrder(how.order).map((id, i) => [id, i]));
	return [...rows].sort((a, b) => (place.get(a.id) ?? 0) - (place.get(b.id) ?? 0));
}

/** The list with one entry taken out and put back at another place. */
export function moved<T>(list: T[], from: number, to: number): T[] {
	const next = [...list];
	next.splice(to, 0, ...next.splice(from, 1));
	return next;
}
