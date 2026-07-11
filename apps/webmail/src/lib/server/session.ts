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
	deleteSessionRow,
	getSessionRow,
	hasStepUpProof,
	hasSessionRow,
	listSessionAccountRows,
	putSessionRow,
	putStepUpProof,
	setSessionAccountDevice,
	syncSessionAccountRows,
	touchSessionRow
} from './store-db';
import { getStoreDb } from './store-instance';
import {
	isPasswordLoginEnabled,
	isStalwartOauthEnabled
} from './oauth-config';

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
	syncSessionAccountRows(
		db,
		session.id,
		session.accounts.map((account) => accountKey(account.username)),
		now
	);
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
		if (isStalwartOauthEnabled() && !isPasswordLoginEnabled()) {
			const tokenAccounts = data.accounts.filter(
				(account) =>
					account.authMethod === 'oauth' &&
					Boolean(account.accessToken) &&
					Boolean(account.refreshToken)
			);
			if (!tokenAccounts.length) {
				deleteSessionRow(db, id);
				return null;
			}
			if (tokenAccounts.length !== data.accounts.length) {
				const activeKey = tokenAccounts.some(
					(account) => accountKey(account.username) === data.activeKey
				)
					? data.activeKey
					: accountKey(tokenAccounts[0].username);
				const migrated = { ...data, accounts: tokenAccounts, activeKey };
				persistSession(migrated, secret);
				return migrated;
			}
		}
		// Bump the sliding-expiry timestamp at most hourly; per-row UPDATE, so
		// concurrent requests can't clobber each other's session records.
		if (Date.now() - record.updatedAt > SESSION_TOUCH_THROTTLE_MS) {
			const now = Date.now();
			touchSessionRow(db, id, now);
			syncSessionAccountRows(
				db,
				id,
				data.accounts.map((account) => accountKey(account.username)),
				now
			);
		}
		return data;
	}

	// Legacy: record held a single SessionData → upgrade to multi-account in place.
	const legacy = data as SessionData;
	if (
		isStalwartOauthEnabled() &&
		!isPasswordLoginEnabled() &&
		(legacy.authMethod !== 'oauth' || !legacy.accessToken || !legacy.refreshToken)
	) {
		deleteSessionRow(db, id);
		return null;
	}
	const upgraded = wrapAccount(legacy, id, record.expiresAt !== null);
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
 * Create a fresh token-only session for a login, replacing any existing one.
 * "Remember me" extends this browser session; it never copies credentials or
 * refresh tokens into a separate linked-account store.
 */
export function writeSession(
	cookies: Cookies,
	data: SessionData,
	options?: { remember?: boolean; secret?: string }
): void {
	const id = data.id ?? newSessionId();
	const session: Session = {
		id,
		accounts: [bareAccount(data)],
		activeKey: accountKey(data.username),
		remember: options?.remember
	};
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
	const next = withAccountTokens(session, data);
	persistSession(next, secret);
}

export function recordSessionDevice(
	cookies: Cookies,
	userAgent: string | null,
	ipHash: string | null,
	secret?: string
): void {
	const session = readSessionFull(cookies, secret);
	const active = session && getActiveAccount(session);
	if (!session || !active) return;
	setSessionAccountDevice(
		getStoreDb(),
		session.id,
		accountKey(active.username),
		userAgent?.slice(0, 240) || null,
		ipHash
	);
}

export function listAccountSessions(cookies: Cookies, secret?: string) {
	const session = readSessionFull(cookies, secret);
	const active = session && getActiveAccount(session);
	if (!session || !active) return [];
	return listSessionAccountRows(getStoreDb(), accountKey(active.username)).map((row) => ({
		id: row.sessionId,
		current: row.sessionId === session.id,
		createdAt: row.createdAt,
		lastSeenAt: row.updatedAt,
		userAgent: row.userAgent
	}));
}

/** Remove one account from any local browser session, preserving sibling accounts. */
export function revokeAccountSession(
	cookies: Cookies,
	targetSessionId: string,
	key: string,
	secret?: string
): boolean {
	const target = readSessionRecord(targetSessionId, secret);
	if (!target || !getAccount(target, key)) return false;
	const next = dropAccount(target, key);
	if (!next) {
		removeSessionRecord(targetSessionId);
		if (cookies.get(COOKIE_NAME) === targetSessionId) {
			cookies.delete(COOKIE_NAME, { path: '/' });
		}
		return true;
	}
	persistSession(next, secret);
	return true;
}

export function revokeOtherAccountSessions(cookies: Cookies, key: string, secret?: string): number {
	const current = readSessionFull(cookies, secret);
	if (!current) return 0;
	let revoked = 0;
	for (const row of listSessionAccountRows(getStoreDb(), accountKey(key))) {
		if (row.sessionId !== current.id && revokeAccountSession(cookies, row.sessionId, key, secret)) {
			revoked++;
		}
	}
	return revoked;
}

export function rotateSessionId(cookies: Cookies, secret?: string): Session | null {
	const current = readSessionFull(cookies, secret);
	if (!current) return null;
	const now = Date.now();
	const recentlyVerified = current.accounts
		.map((account) => accountKey(account.username))
		.filter((key) => hasStepUpProof(getStoreDb(), current.id, key, now));
	const next = { ...current, id: newSessionId() };
	removeSessionRecord(current.id);
	persistSession(next, secret);
	for (const key of recentlyVerified) {
		putStepUpProof(getStoreDb(), next.id, key, now, now + 5 * 60_000);
	}
	syncIdCookie(cookies, next.id, { remember: next.remember });
	return next;
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

export function clearSession(cookies: Cookies): void {
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
