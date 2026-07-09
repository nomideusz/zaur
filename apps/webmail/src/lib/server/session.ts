import { randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import {
	accountKey,
	bareAccount,
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
import { sealSession, unsealSession } from './session-crypto';
import {
	forgetLinkedAccount,
	forgetLinkedAccounts,
	rememberLinkedAccounts,
	restoreLinkedAccounts
} from './linked-accounts';
import {
	deleteSessionRow,
	getSessionRow,
	hasSessionRow,
	putSessionRow,
	touchSessionRow
} from './store-db';
import { getStoreDb } from './store-instance';

export type { SessionData, AccountSession, Session } from './session-model';
export { accountKey, getActiveAccount, getAccount, listAccounts } from './session-model';
export { sealSession, unsealSession } from './session-crypto';

export const COOKIE_NAME = 'zaur_session';
/** Persistent session when the user chooses “Remember me”. */
export const REMEMBERED_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days
const SESSION_RECORD_MAX_AGE_MS = REMEMBERED_SESSION_MAX_AGE_SEC * 1000;
const SESSION_TOUCH_THROTTLE_MS = 60 * 60 * 1000; // re-write updatedAt at most hourly

export { SESSION_RECORD_MAX_AGE_MS };

function newSessionId(): string {
	return randomBytes(32).toString('base64url');
}

function isExpiredRow(row: { updatedAt: number; expiresAt: number | null }, now = Date.now()): boolean {
	if (row.expiresAt !== null && now > row.expiresAt) return true;
	return now - row.updatedAt > SESSION_RECORD_MAX_AGE_MS;
}

/* ── Store records (hold a multi-account Session) ─────────────────────────── */

function persistSession(session: Session, secret?: string): void {
	const db = getStoreDb();
	const existing = getSessionRow(db, session.id);
	const now = Date.now();
	putSessionRow(db, {
		id: session.id,
		username: getActiveAccount(session)?.username ?? session.accounts[0]?.username ?? '',
		sealedData: sealSession(session, secret),
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
		expiresAt: session.remember ? now + SESSION_RECORD_MAX_AGE_MS : null
	});
}

/** Read a stored session by id, upgrading a legacy single-account record in place. */
function readSessionRecord(id: string | undefined, secret?: string): Session | null {
	if (!id) return null;

	const db = getStoreDb();
	const record = getSessionRow(db, id);
	if (!record) return null;

	if (isExpiredRow(record)) {
		deleteSessionRow(db, id);
		return null;
	}

	const data = unsealSession(record.sealedData, secret);
	if (!data) {
		deleteSessionRow(db, id);
		return null;
	}

	if (isSession(data)) {
		// Bump the sliding-expiry timestamp at most hourly; per-row UPDATE, so
		// concurrent requests can't clobber each other's session records.
		if (Date.now() - record.updatedAt > SESSION_TOUCH_THROTTLE_MS) {
			touchSessionRow(db, id, Date.now());
		}
		return data;
	}

	// Legacy: record held a single SessionData → upgrade to multi-account in place.
	const upgraded = wrapAccount(data as SessionData, id, record.expiresAt !== null);
	putSessionRow(db, {
		...record,
		sealedData: sealSession(upgraded, secret),
		updatedAt: Date.now()
	});
	return upgraded;
}

function removeSessionRecord(id: string | undefined): void {
	if (!id) return;
	deleteSessionRow(getStoreDb(), id);
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

	// New format: cookie is the session id → look up the (revocable) store record.
	const byId = readSessionRecord(token, secret);
	if (byId) return byId;

	// Legacy format: cookie is a sealed blob. Only honour it while it still points at
	// a live store record, so sign-out/expiry actually revokes it. A self-contained
	// blob with no backing record is NOT resurrected — that was an un-revocable
	// session (a captured old cookie stayed valid after logout). Those re-login.
	const direct = unsealSession(token, secret);
	if (direct && typeof direct === 'object' && 'username' in direct) {
		const legacy = direct as SessionData;
		if (legacy.id) {
			const viaRecord = readSessionRecord(legacy.id, secret);
			if (viaRecord) {
				syncIdCookie(cookies, viaRecord.id, { remember: viaRecord.remember });
				return viaRecord;
			}
		}
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

/** All accounts of a session looked up by id, each carrying the session id (push-watcher). */
export function readAccountsById(id: string | undefined, secret?: string): SessionData[] {
	const session = readSessionRecord(id, secret);
	if (!session) return [];
	return session.accounts.map((account) => ({ ...account, id: session.id }));
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

/**
 * Create a fresh session for a login, replacing any existing one. With "Remember
 * me" on, the accounts previously linked to this user are restored alongside the
 * just-authenticated one (which stays active and keeps this login's fresh tokens)
 * — so a multi-account set survives sign-out and follows the user across devices.
 */
export function writeSession(
	cookies: Cookies,
	data: SessionData,
	options?: { remember?: boolean; secret?: string }
): void {
	const id = data.id ?? newSessionId();
	const accounts = options?.remember ? restoreLinkedAccounts(data) : [bareAccount(data)];
	const session: Session = {
		id,
		accounts,
		activeKey: accountKey(data.username),
		remember: options?.remember
	};
	persistSession(session, options?.secret);
	syncIdCookie(cookies, id, options);
	// Re-seal the group with this login's fresh tokens (and prune any since-removed members).
	if (options?.remember) rememberLinkedAccounts(session.accounts);
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
	// Durably link the group so it is restored on a later fresh sign-in (any device).
	if (session.remember) rememberLinkedAccounts(session.accounts);
	return session;
}

/** Remove an account; clears the whole session when the last one goes. */
export function removeAccount(cookies: Cookies, key: string, secret?: string): Session | null {
	const session = readSessionFull(cookies, secret);
	if (!session) return null;
	const next = dropAccount(session, key);
	// Intentional removal: drop it from the durable groups too, so it does not
	// reappear on the next remembered sign-in.
	forgetLinkedAccount(key);
	if (!next) {
		clearSession(cookies);
		return null;
	}
	persistSession(next, secret);
	if (next.remember) rememberLinkedAccounts(next.accounts);
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
	const next = withAccountTokens(session, data);
	persistSession(next, secret);
	// Keep the durable group in sync when an account's stored data changes.
	if (next.remember && next.accounts.length >= 2) rememberLinkedAccounts(next.accounts);
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
	// Explicit sign-out forgets the durable group, so "Sign out" stays a real
	// "forget me" — the linked accounts will not be restored on the next login.
	const session = readSessionFull(cookies);
	if (session) forgetLinkedAccounts(session.accounts);

	const token = cookies.get(COOKIE_NAME);
	if (token) {
		// token is normally the session id; tolerate a legacy sealed-blob cookie too.
		if (hasSessionRow(getStoreDb(), token)) {
			removeSessionRecord(token);
		} else {
			const data = unsealSession(token);
			const id = isSession(data) ? data.id : (data as SessionData | null)?.id;
			removeSessionRecord(id ?? token);
		}
	}
	cookies.delete(COOKIE_NAME, { path: '/' });
}
