import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	dropAccount,
	getAccount,
	getActiveAccount,
	isSession,
	upsertAccount,
	withAccountTokens,
	withActiveAccount,
	wrapAccount,
	type Session,
	type SessionData
} from './session-model';

export type { SessionData, AccountSession, Session } from './session-model';
export { accountKey, getActiveAccount, getAccount, listAccounts } from './session-model';

export const COOKIE_NAME = 'zaur_session';
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
/** Persistent session when the user chooses “Remember me”. */
export const REMEMBERED_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days
const SESSION_RECORD_MAX_AGE_MS = REMEMBERED_SESSION_MAX_AGE_SEC * 1000;
const DEFAULT_SESSION_STORE_PATH = path.join(process.cwd(), '.data', 'sessions.json');

interface StoredSessionRecord {
	id: string;
	username: string;
	sealedData: string;
	createdAt: string;
	updatedAt: string;
	expiresAt?: string;
}

type SessionStore = Record<string, StoredSessionRecord>;

function newSessionId(): string {
	return randomBytes(32).toString('base64url');
}

function getKey(secret: string): Buffer {
	return createHash('sha256').update(secret).digest();
}

function requireSecret(secret: string | undefined): string {
	if (secret?.trim()) return secret.trim();
	if (process.env.NODE_ENV === 'production') {
		throw new Error('SESSION_SECRET must be set in production');
	}
	return 'dev-insecure-session-secret-change-me';
}

function getSessionStorePath(): string {
	return env.SESSION_STORE_PATH?.trim() || DEFAULT_SESSION_STORE_PATH;
}

function readSessionStore(): SessionStore {
	try {
		const raw = readFileSync(getSessionStorePath(), 'utf8');
		const parsed = JSON.parse(raw) as SessionStore;
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

function writeSessionStore(store: SessionStore): void {
	const storePath = getSessionStorePath();
	mkdirSync(path.dirname(storePath), { recursive: true });
	// Write-then-rename so a crash or concurrent reader never sees a truncated file.
	const tmpPath = `${storePath}.${randomBytes(6).toString('hex')}.tmp`;
	writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
	renameSync(tmpPath, storePath);
}

function isExpired(record: StoredSessionRecord, now = Date.now()): boolean {
	const expiresAt = record.expiresAt ? Date.parse(record.expiresAt) : NaN;
	if (Number.isFinite(expiresAt) && now > expiresAt) return true;

	const updatedAt = Date.parse(record.updatedAt || record.createdAt);
	if (!Number.isFinite(updatedAt)) return true;
	return now - updatedAt > SESSION_RECORD_MAX_AGE_MS;
}

function pruneExpiredSessions(store: SessionStore): boolean {
	const now = Date.now();
	let pruned = false;
	for (const [id, record] of Object.entries(store)) {
		if (isExpired(record, now)) {
			delete store[id];
			pruned = true;
		}
	}
	return pruned;
}

export function sealSession(data: unknown, secret?: string): string {
	const key = getKey(requireSecret(secret ?? env.SESSION_SECRET));
	const iv = randomBytes(IV_LEN);
	const cipher = createCipheriv(ALGO, key, iv);
	const plaintext = JSON.stringify(data);
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function unsealSession(token: string, secret?: string): unknown {
	try {
		const key = getKey(requireSecret(secret ?? env.SESSION_SECRET));
		const buf = Buffer.from(token, 'base64url');
		const iv = buf.subarray(0, IV_LEN);
		const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
		const encrypted = buf.subarray(IV_LEN + TAG_LEN);
		const decipher = createDecipheriv(ALGO, key, iv);
		decipher.setAuthTag(tag);
		const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
		return JSON.parse(plaintext);
	} catch {
		return null;
	}
}

/* ── Store records (hold a multi-account Session) ─────────────────────────── */

function persistSession(session: Session, secret?: string): void {
	const store = readSessionStore();
	pruneExpiredSessions(store);

	const existing = store[session.id];
	const now = new Date().toISOString();
	store[session.id] = {
		id: session.id,
		username: getActiveAccount(session)?.username ?? session.accounts[0]?.username ?? '',
		sealedData: sealSession(session, secret),
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
		...(session.remember
			? { expiresAt: new Date(Date.now() + SESSION_RECORD_MAX_AGE_MS).toISOString() }
			: {})
	};
	writeSessionStore(store);
}

/** Read a stored session by id, upgrading a legacy single-account record in place. */
function readSessionRecord(id: string | undefined, secret?: string): Session | null {
	if (!id) return null;

	const store = readSessionStore();
	const record = store[id];
	if (!record) return null;

	if (isExpired(record)) {
		delete store[id];
		writeSessionStore(store);
		return null;
	}

	const data = unsealSession(record.sealedData, secret);
	if (!data) {
		delete store[id];
		writeSessionStore(store);
		return null;
	}

	if (isSession(data)) {
		record.updatedAt = new Date().toISOString();
		store[id] = record;
		writeSessionStore(store);
		return data;
	}

	// Legacy: record held a single SessionData → upgrade to multi-account in place.
	const upgraded = wrapAccount(data as SessionData, id, !!record.expiresAt);
	record.sealedData = sealSession(upgraded, secret);
	record.updatedAt = new Date().toISOString();
	store[id] = record;
	writeSessionStore(store);
	return upgraded;
}

function removeSessionRecord(id: string | undefined): void {
	if (!id) return;
	const store = readSessionStore();
	if (!store[id]) return;
	delete store[id];
	writeSessionStore(store);
}

/* ── Reading the session ──────────────────────────────────────────────────── */

/**
 * Resolve the full multi-account session from the cookie, transparently
 * upgrading the two legacy cookie formats (a sealed single-account blob, or an
 * id pointing at a legacy single-account record) to the id-only cookie + the
 * multi-account store format.
 */
export function readSessionFull(cookies: Cookies, secret?: string): Session | null {
	const token = cookies.get(COOKIE_NAME);
	if (!token) return null;

	// New format: cookie is the session id.
	const byId = readSessionRecord(token, secret);
	if (byId) return byId;

	// Legacy format: cookie is a sealed blob.
	const direct = unsealSession(token, secret);
	if (isSession(direct)) {
		persistSession(direct, secret);
		syncIdCookie(cookies, direct.id, { remember: direct.remember });
		return direct;
	}
	if (direct && typeof direct === 'object' && 'username' in direct) {
		const legacy = direct as SessionData;
		// The old cookie sealed the account *and* carried its store-record id, where the
		// same data lives with the correct remember-state. Upgrade via that record so a
		// non-remembered session is not silently promoted to a 30-day one.
		if (legacy.id) {
			const viaRecord = readSessionRecord(legacy.id, secret);
			if (viaRecord) {
				syncIdCookie(cookies, viaRecord.id, { remember: viaRecord.remember });
				return viaRecord;
			}
		}
		// No backing record (very old / edge case): create one, defaulting to remembered.
		const id = legacy.id ?? newSessionId();
		const upgraded = wrapAccount(legacy, id, true);
		persistSession(upgraded, secret);
		syncIdCookie(cookies, id, { remember: true });
		return upgraded;
	}

	return null;
}

/**
 * The active account as a single {@link SessionData}, carrying the session id so
 * existing callers (proxy endpoints, settings, push) keep working unchanged.
 */
export function readSession(cookies: Cookies, secret?: string): SessionData | null {
	const session = readSessionFull(cookies, secret);
	if (!session) return null;
	const active = getActiveAccount(session);
	if (!active) return null;
	return { ...active, id: session.id };
}

/** The active account of a session looked up by id (no cookie needed; used by push-watcher). */
export function readSessionById(id: string | undefined, secret?: string): SessionData | null {
	const session = readSessionRecord(id, secret);
	if (!session) return null;
	const active = getActiveAccount(session);
	return active ? { ...active, id: session.id } : null;
}

/** Header a request may set to target a specific account; otherwise the active one is used. */
export const ACCOUNT_HEADER = 'x-zaur-account';

/**
 * The account a proxied request targets: the one named by the `X-Zaur-Account`
 * header (if it belongs to this session) else the active account. Returns a
 * {@link SessionData} carrying the session id so token refresh writes back to the
 * right account.
 */
export function resolveRequestAccount(
	cookies: Cookies,
	request?: Request,
	secret?: string
): SessionData | null {
	const session = readSessionFull(cookies, secret);
	if (!session) return null;
	const requested = request?.headers.get(ACCOUNT_HEADER) ?? undefined;
	const account = (requested ? getAccount(session, requested) : undefined) ?? getActiveAccount(session);
	return account ? { ...account, id: session.id } : null;
}

/* ── Mutations ────────────────────────────────────────────────────────────── */

/** Create a fresh single-account session, replacing any existing one. */
export function writeSession(
	cookies: Cookies,
	data: SessionData,
	options?: { remember?: boolean; secret?: string }
): void {
	const id = data.id ?? newSessionId();
	const session = wrapAccount(data, id, options?.remember);
	persistSession(session, options?.secret);
	syncIdCookie(cookies, id, options);
}

/**
 * Add (or replace, keyed by email) an account in the current session and make it
 * active. Creates the session if none exists. Returns the updated session.
 */
export function addAccount(
	cookies: Cookies,
	data: SessionData,
	options?: { remember?: boolean; secret?: string }
): Session {
	const existing = readSessionFull(cookies, options?.secret);
	const session = existing
		? upsertAccount(existing, data, options?.remember)
		: wrapAccount(data, newSessionId(), options?.remember);
	persistSession(session, options?.secret);
	syncIdCookie(cookies, session.id, { remember: session.remember });
	return session;
}

/** Remove an account; clears the whole session when the last one goes. */
export function removeAccount(cookies: Cookies, key: string, secret?: string): Session | null {
	const session = readSessionFull(cookies, secret);
	if (!session) return null;
	const next = dropAccount(session, key);
	if (!next) {
		clearSession(cookies);
		return null;
	}
	persistSession(next, secret);
	return next;
}

/** Switch the active account (no-op if the key is unknown). */
export function setActiveAccount(cookies: Cookies, key: string, secret?: string): Session | null {
	const session = readSessionFull(cookies, secret);
	if (!session) return null;
	const next = withActiveAccount(session, key);
	persistSession(next, secret);
	return next;
}

/** Refresh-token write-back for a single account. Updates only the matching account. */
export function updateAccountTokens(id: string, data: SessionData, secret?: string): void {
	const session = readSessionRecord(id, secret);
	if (!session) return;
	persistSession(withAccountTokens(session, data), secret);
}

/** @deprecated back-compat alias — use {@link updateAccountTokens}. */
export function updateSessionData(id: string, data: SessionData, secret?: string): void {
	updateAccountTokens(id, data, secret);
}

/* ── Cookie ───────────────────────────────────────────────────────────────── */

function syncIdCookie(cookies: Cookies, id: string, options?: { remember?: boolean }): void {
	const cookieOptions: Parameters<Cookies['set']>[2] = {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production'
	};
	if (options?.remember) {
		cookieOptions.maxAge = REMEMBERED_SESSION_MAX_AGE_SEC;
	}
	cookies.set(COOKIE_NAME, id, cookieOptions);
}

/**
 * Back-compat: previously re-sealed the cookie on token refresh. The cookie now
 * holds only the session id, so this just re-asserts it (id + maxAge).
 */
export function syncSessionCookie(
	cookies: Cookies,
	data: SessionData,
	options?: { remember?: boolean; secret?: string }
): void {
	if (!data.id) return;
	syncIdCookie(cookies, data.id, options);
}

export function clearSession(cookies: Cookies): void {
	const token = cookies.get(COOKIE_NAME);
	if (token) {
		// token is normally the session id; tolerate a legacy sealed-blob cookie too.
		if (readSessionStore()[token]) {
			removeSessionRecord(token);
		} else {
			const data = unsealSession(token);
			const id = isSession(data) ? data.id : (data as SessionData | null)?.id;
			removeSessionRecord(id ?? token);
		}
	}
	cookies.delete(COOKIE_NAME, { path: '/' });
}
