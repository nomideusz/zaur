/**
 * Pure, dependency-free session/account transforms. No crypto, filesystem, env,
 * or SvelteKit imports live here so this module is unit-testable in plain node.
 * The I/O layer (cookie, encrypted store, token refresh) lives in `session.ts`.
 */

/** One mailbox the user is signed into — the per-account shape the server operates on. */
export interface SessionData {
	serverUrl: string;
	username: string;
	displayName?: string;
	password?: string;
	accessToken?: string;
	refreshToken?: string;
	/** Session id (the cookie value). Set on the active account returned by readSession(). */
	id?: string;
}

/** Alias for clarity in multi-account code; identical to {@link SessionData}. */
export type AccountSession = SessionData;

/** The full multi-account session persisted server-side; the cookie holds only its id. */
export interface Session {
	id: string;
	accounts: SessionData[];
	/** accountKey() of the active account. */
	activeKey: string;
	remember?: boolean;
}

/** Stable key for an account within a session — the normalized email. */
export function accountKey(username: string): string {
	return username.trim().toLowerCase();
}

export function isSession(value: unknown): value is Session {
	return !!value && typeof value === 'object' && Array.isArray((value as Session).accounts);
}

/** Strip the session-id field so it is never stored on a per-account record. */
export function bareAccount(data: SessionData): SessionData {
	const { id: _drop, ...rest } = data;
	return rest;
}

/** Wrap a single account into a fresh one-account session. */
export function wrapAccount(data: SessionData, id: string, remember?: boolean): Session {
	return {
		id,
		accounts: [bareAccount(data)],
		activeKey: accountKey(data.username),
		remember
	};
}

export function getActiveAccount(session: Session): SessionData | undefined {
	return (
		session.accounts.find((a) => accountKey(a.username) === session.activeKey) ??
		session.accounts[0]
	);
}

export function getAccount(session: Session, key: string): SessionData | undefined {
	const k = accountKey(key);
	return session.accounts.find((a) => accountKey(a.username) === k);
}

export function listAccounts(session: Session): SessionData[] {
	return session.accounts;
}

/** Add or replace (keyed by email) an account and make it active. */
export function upsertAccount(session: Session, data: SessionData, remember?: boolean): Session {
	const key = accountKey(data.username);
	const accounts = session.accounts.filter((a) => accountKey(a.username) !== key);
	accounts.push(bareAccount(data));
	return {
		...session,
		accounts,
		activeKey: key,
		remember: remember ?? session.remember
	};
}

/** Remove an account. Returns null when the last account is removed. */
export function dropAccount(session: Session, key: string): Session | null {
	const k = accountKey(key);
	const accounts = session.accounts.filter((a) => accountKey(a.username) !== k);
	if (!accounts.length) return null;
	const activeKey = accounts.some((a) => accountKey(a.username) === session.activeKey)
		? session.activeKey
		: accountKey(accounts[0].username);
	return { ...session, accounts, activeKey };
}

/** Switch the active account; a no-op if the key is unknown. */
export function withActiveAccount(session: Session, key: string): Session {
	const k = accountKey(key);
	if (!session.accounts.some((a) => accountKey(a.username) === k)) return session;
	return { ...session, activeKey: k };
}

/** Replace the matching account's data (token refresh); appends if not present. */
export function withAccountTokens(session: Session, data: SessionData): Session {
	const key = accountKey(data.username);
	const accounts = session.accounts.slice();
	const idx = accounts.findIndex((a) => accountKey(a.username) === key);
	if (idx >= 0) accounts[idx] = bareAccount(data);
	else accounts.push(bareAccount(data));
	return { ...session, accounts };
}
