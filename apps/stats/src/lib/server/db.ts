/**
 * One SQLite file, one writer: this process. A row is a page opened; its end
 * beacons fill in time, depth and clicks. No address is ever a column, and the
 * owner's own are held only as a keyed hash (owner_ips).
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function openDb(path: string): DatabaseSync {
	if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
	const db = new DatabaseSync(path);
	db.exec(`
		PRAGMA journal_mode = WAL;
		PRAGMA synchronous = NORMAL;
		PRAGMA busy_timeout = 5000;
		CREATE TABLE IF NOT EXISTS views (
			site TEXT NOT NULL,
			id TEXT NOT NULL,
			t INTEGER NOT NULL,
			day TEXT NOT NULL,
			hour INTEGER NOT NULL,
			host TEXT,
			path TEXT NOT NULL,
			source TEXT NOT NULL,
			ref TEXT,
			tag TEXT,
			hash TEXT,
			tz TEXT,
			lang TEXT,
			w INTEGER,
			h INTEGER,
			screen TEXT,
			dpr REAL,
			dark INTEGER,
			device TEXT,
			browser TEXT,
			os TEXT,
			city TEXT,
			region TEXT,
			country TEXT,
			org TEXT,
			org_type TEXT,
			hosting INTEGER,
			vpn INTEGER,
			mobile INTEGER,
			me INTEGER NOT NULL DEFAULT 0,
			agent INTEGER NOT NULL DEFAULT 0,
			secs INTEGER,
			depth INTEGER,
			clicks TEXT,
			seen TEXT,
			PRIMARY KEY (site, id)
		);
		CREATE INDEX IF NOT EXISTS views_site_day ON views (site, day);
		CREATE INDEX IF NOT EXISTS views_t ON views (t);
		CREATE TABLE IF NOT EXISTS owner_ips (
			hash TEXT PRIMARY KEY,
			seen INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS prefs (
			email TEXT PRIMARY KEY,
			site_order TEXT,
			ranked INTEGER NOT NULL DEFAULT 1
		);
	`);
	return db;
}

let db: DatabaseSync | undefined;
export function getDb(): DatabaseSync {
	return (db ??= openDb(process.env.STATS_DB?.trim() || './data/stats.db'));
}
