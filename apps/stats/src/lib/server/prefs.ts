/** How the owner has arranged the dashboard, kept with the data so a desk and a phone agree. */
import type { DatabaseSync } from 'node:sqlite';
import { readSort, wholeOrder, type Arrangement } from '#lib/arrange';

type Row = { site_order: string | null; ranked: number; sort: string | null; sort_asc: number };

export function readArrangement(db: DatabaseSync, email: string): Arrangement {
	const row = db.prepare('SELECT site_order, ranked, sort, sort_asc FROM prefs WHERE email = ?').get(email.trim().toLowerCase()) as Row | undefined;
	return {
		order: wholeOrder(row?.site_order ? JSON.parse(row.site_order) : null),
		// A row from before any column could be chosen says only whether it was ranked.
		sort: readSort(row?.sort) ?? (!row || row.ranked === 1 ? 'count' : 'own'),
		asc: row?.sort_asc === 1
	};
}

export function writeArrangement(db: DatabaseSync, email: string, change: Partial<Arrangement>): void {
	const next = { ...readArrangement(db, email), ...change };
	db.prepare(
		`INSERT INTO prefs (email, site_order, ranked, sort, sort_asc) VALUES (?, ?, ?, ?, ?)
		ON CONFLICT (email) DO UPDATE SET site_order = excluded.site_order, ranked = excluded.ranked, sort = excluded.sort, sort_asc = excluded.sort_asc`
	).run(email.trim().toLowerCase(), JSON.stringify(wholeOrder(next.order)), next.sort === 'own' ? 0 : 1, next.sort, next.asc ? 1 : 0);
}
