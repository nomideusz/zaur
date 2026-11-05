/** How the owner has arranged the dashboard, kept with the data so a desk and a phone agree. */
import type { DatabaseSync } from 'node:sqlite';
import { wholeOrder, type Arrangement } from '#lib/arrange';

export function readArrangement(db: DatabaseSync, email: string): Arrangement {
	const row = db.prepare('SELECT site_order, ranked FROM prefs WHERE email = ?').get(email.trim().toLowerCase()) as { site_order: string | null; ranked: number } | undefined;
	return { order: wholeOrder(row?.site_order ? JSON.parse(row.site_order) : null), ranked: row ? row.ranked === 1 : true };
}

export function writeArrangement(db: DatabaseSync, email: string, change: Partial<Arrangement>): void {
	const next = { ...readArrangement(db, email), ...change };
	db.prepare('INSERT INTO prefs (email, site_order, ranked) VALUES (?, ?, ?) ON CONFLICT (email) DO UPDATE SET site_order = excluded.site_order, ranked = excluded.ranked').run(
		email.trim().toLowerCase(),
		JSON.stringify(wholeOrder(next.order)),
		next.ranked ? 1 : 0
	);
}
