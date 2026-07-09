/**
 * Process-wide handle to the server SQLite store. Separated from `store-db.ts`
 * so the pure DB helpers stay testable without SvelteKit's `$env`.
 */
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { env } from '$env/dynamic/private';
import { importLegacySessionsJson, openStoreDb, pruneRateLimitRows, pruneSessionRows } from './store-db';
import { log } from './log';

const DEFAULT_DB_PATH = path.join(process.cwd(), '.data', 'store.sqlite');
const LEGACY_SESSIONS_JSON = path.join(process.cwd(), '.data', 'sessions.json');
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

let db: DatabaseSync | null = null;

export function getStoreDb(): DatabaseSync {
	if (db) return db;

	const dbPath = env.STORE_DB_PATH?.trim() || DEFAULT_DB_PATH;
	db = openStoreDb(dbPath);

	// Legacy JSON store import — honours SESSION_STORE_PATH the old code used.
	const legacyPath = env.SESSION_STORE_PATH?.trim() || LEGACY_SESSIONS_JSON;
	try {
		const imported = importLegacySessionsJson(db, legacyPath);
		if (imported > 0) {
			log.info('session_store_migrated', { imported, from: legacyPath, to: dbPath });
		}
	} catch (error) {
		log.error('session_store_migration_failed', { from: legacyPath }, error);
	}

	return db;
}

/** Hourly cleanup of expired sessions and lapsed rate-limit windows. */
export function startStoreMaintenance(sessionMaxAgeMs: number): () => void {
	const timer = setInterval(() => {
		try {
			const store = getStoreDb();
			const pruned = pruneSessionRows(store, Date.now(), sessionMaxAgeMs);
			pruneRateLimitRows(store);
			if (pruned > 0) log.info('sessions_pruned', { count: pruned });
		} catch (error) {
			log.error('store_maintenance_failed', {}, error);
		}
	}, PRUNE_INTERVAL_MS);
	timer.unref();
	return () => clearInterval(timer);
}
