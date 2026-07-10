/**
 * Server-side SQLite store (node:sqlite, WAL) for state that must survive
 * restarts and stay correct under concurrent access: session records and
 * rate-limit buckets. Replaces the JSON-file session store, whose whole-file
 * read-modify-write cycle was O(all sessions) per mutation and a last-writer-wins
 * race, and the in-memory rate limiter, which reset on every deploy.
 *
 * This module is deliberately free of SvelteKit imports ($env, $app) so the
 * plain `node --test` unit tests can exercise it against ':memory:'.
 * Env-aware wiring lives in `store-instance.ts`.
 */
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface SessionRow {
	id: string;
	username: string;
	sealedData: string;
	/** Epoch ms. */
	createdAt: number;
	/** Epoch ms. */
	updatedAt: number;
	/** Epoch ms, or null for sliding expiry off updatedAt. */
	expiresAt: number | null;
}

export interface OauthFlowRow {
	stateHash: string;
	sealedData: string;
	expiresAt: number;
}

export function openStoreDb(dbPath: string): DatabaseSync {
	if (dbPath !== ':memory:') {
		mkdirSync(path.dirname(dbPath), { recursive: true });
	}
	const db = new DatabaseSync(dbPath);
	db.exec(`
		PRAGMA journal_mode = WAL;
		PRAGMA synchronous = NORMAL;
		PRAGMA busy_timeout = 5000;
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL DEFAULT '',
			sealed_data TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			expires_at INTEGER
		);
		CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions (updated_at);
		CREATE TABLE IF NOT EXISTS rate_limits (
			key TEXT PRIMARY KEY,
			count INTEGER NOT NULL,
			reset_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS oauth_flows (
			state_hash TEXT PRIMARY KEY,
			sealed_data TEXT NOT NULL,
			expires_at INTEGER NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_oauth_flows_expires_at ON oauth_flows (expires_at);
	`);
	return db;
}

/* ── Sessions ─────────────────────────────────────────────────────────────── */

interface RawSessionRow {
	id: string;
	username: string;
	sealed_data: string;
	created_at: number;
	updated_at: number;
	expires_at: number | null;
}

function toRow(raw: RawSessionRow): SessionRow {
	return {
		id: raw.id,
		username: raw.username,
		sealedData: raw.sealed_data,
		createdAt: raw.created_at,
		updatedAt: raw.updated_at,
		expiresAt: raw.expires_at
	};
}

export function getSessionRow(db: DatabaseSync, id: string): SessionRow | null {
	const raw = db
		.prepare('SELECT id, username, sealed_data, created_at, updated_at, expires_at FROM sessions WHERE id = ?')
		.get(id) as RawSessionRow | undefined;
	return raw ? toRow(raw) : null;
}

export function hasSessionRow(db: DatabaseSync, id: string): boolean {
	return db.prepare('SELECT 1 FROM sessions WHERE id = ?').get(id) !== undefined;
}

/** Upsert; `createdAt` is preserved when the row already exists. */
export function putSessionRow(db: DatabaseSync, row: SessionRow): void {
	db.prepare(
		`INSERT INTO sessions (id, username, sealed_data, created_at, updated_at, expires_at)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
			username = excluded.username,
			sealed_data = excluded.sealed_data,
			updated_at = excluded.updated_at,
			expires_at = excluded.expires_at`
	).run(row.id, row.username, row.sealedData, row.createdAt, row.updatedAt, row.expiresAt);
}

/** Bump the sliding-expiry timestamp without rewriting the sealed payload. */
export function touchSessionRow(db: DatabaseSync, id: string, updatedAt: number): void {
	db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(updatedAt, id);
}

export function deleteSessionRow(db: DatabaseSync, id: string): void {
	db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

/** Drop sessions past their explicit expiry or idle beyond `maxAgeMs`. */
export function pruneSessionRows(db: DatabaseSync, now: number, maxAgeMs: number): number {
	const result = db
		.prepare(
			'DELETE FROM sessions WHERE (expires_at IS NOT NULL AND expires_at < ?) OR updated_at < ?'
		)
		.run(now, now - maxAgeMs);
	return Number(result.changes);
}

/**
 * One-time import of the legacy JSON session store. Rows already present in
 * SQLite win. The JSON file is renamed to `<file>.imported` afterwards so the
 * import never re-runs and the old data stays around for a manual rollback.
 */
export function importLegacySessionsJson(db: DatabaseSync, jsonPath: string): number {
	if (!existsSync(jsonPath)) return 0;

	let parsed: unknown;
	try {
		parsed = JSON.parse(readFileSync(jsonPath, 'utf8'));
	} catch {
		return 0;
	}
	if (!parsed || typeof parsed !== 'object') return 0;

	const insert = db.prepare(
		`INSERT OR IGNORE INTO sessions (id, username, sealed_data, created_at, updated_at, expires_at)
		 VALUES (?, ?, ?, ?, ?, ?)`
	);
	let imported = 0;
	for (const record of Object.values(parsed as Record<string, unknown>)) {
		if (!record || typeof record !== 'object') continue;
		const r = record as {
			id?: string;
			username?: string;
			sealedData?: string;
			createdAt?: string;
			updatedAt?: string;
			expiresAt?: string;
		};
		if (!r.id || !r.sealedData) continue;
		const createdAt = Date.parse(r.createdAt ?? '') || Date.now();
		const updatedAt = Date.parse(r.updatedAt ?? '') || createdAt;
		const expiresAt = r.expiresAt ? Date.parse(r.expiresAt) || null : null;
		insert.run(r.id, r.username ?? '', r.sealedData, createdAt, updatedAt, expiresAt);
		imported++;
	}
	renameSync(jsonPath, `${jsonPath}.imported`);
	return imported;
}

/* ── Rate limits ──────────────────────────────────────────────────────────── */

export interface RateLimitOutcome {
	allowed: boolean;
	retryAfterSec: number;
}

/**
 * Atomic fixed-window rate limit: one upsert starts a fresh window when the
 * previous one has lapsed, otherwise increments the counter. The count keeps
 * growing past the limit inside a window (the window is never extended), which
 * matches the previous in-memory behavior.
 */
export function checkRateLimitRow(
	db: DatabaseSync,
	key: string,
	limit: number,
	windowMs: number,
	now = Date.now()
): RateLimitOutcome {
	const row = db
		.prepare(
			`INSERT INTO rate_limits (key, count, reset_at) VALUES (:key, 1, :fresh)
			 ON CONFLICT(key) DO UPDATE SET
				count = CASE WHEN rate_limits.reset_at <= :now THEN 1 ELSE rate_limits.count + 1 END,
				reset_at = CASE WHEN rate_limits.reset_at <= :now THEN :fresh ELSE rate_limits.reset_at END
			 RETURNING count, reset_at`
		)
		.get({ key, now, fresh: now + windowMs }) as { count: number; reset_at: number };

	if (row.count > limit) {
		return {
			allowed: false,
			retryAfterSec: Math.max(1, Math.ceil((row.reset_at - now) / 1000))
		};
	}
	return { allowed: true, retryAfterSec: 0 };
}

export function pruneRateLimitRows(db: DatabaseSync, now = Date.now()): void {
	db.prepare('DELETE FROM rate_limits WHERE reset_at <= ?').run(now);
}

/* ── OAuth flows ─────────────────────────────────────────────────────────── */

export function putOauthFlowRow(db: DatabaseSync, row: OauthFlowRow): void {
	db.prepare(
		`INSERT INTO oauth_flows (state_hash, sealed_data, expires_at)
		 VALUES (?, ?, ?)
		 ON CONFLICT(state_hash) DO UPDATE SET
			sealed_data = excluded.sealed_data,
			expires_at = excluded.expires_at`
	).run(row.stateHash, row.sealedData, row.expiresAt);
}

/** Atomically returns and removes a live flow so callback replay cannot succeed. */
export function consumeOauthFlowRow(
	db: DatabaseSync,
	stateHash: string,
	now = Date.now()
): OauthFlowRow | null {
	const raw = db
		.prepare(
			`DELETE FROM oauth_flows
			 WHERE state_hash = ? AND expires_at >= ?
			 RETURNING state_hash, sealed_data, expires_at`
		)
		.get(stateHash, now) as
		| { state_hash: string; sealed_data: string; expires_at: number }
		| undefined;
	return raw
		? { stateHash: raw.state_hash, sealedData: raw.sealed_data, expiresAt: raw.expires_at }
		: null;
}

export function pruneOauthFlowRows(db: DatabaseSync, now = Date.now()): number {
	return Number(db.prepare('DELETE FROM oauth_flows WHERE expires_at < ?').run(now).changes);
}
