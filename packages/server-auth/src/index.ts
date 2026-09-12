/**
 * @zaur/server-auth — multi-account session store shared by webmail and Mail 2.0.
 *
 * The session cookie holds a session id; the sealed multi-account record lives in
 * a server-local SQLite store (STORE_DB_PATH). Apps that share sessions must point
 * at the same store file and share SESSION_SECRET, and set SESSION_COOKIE_DOMAIN
 * (e.g. `.zaur.app`) so the cookie is visible on sibling subdomains.
 *
 * Kept framework-agnostic on purpose: plain `process.env`, no `$env/*`, and the
 * only SvelteKit import is the `Cookies` *type*.
 */
export {
	ACCOUNT_HEADER,
	COOKIE_NAME,
	REMEMBERED_SESSION_MAX_AGE_SEC,
	SESSION_RECORD_MAX_AGE_MS,
	addAccount,
	clearSession,
	listAccountSessions,
	readAccountsById,
	readSession,
	readSessionFull,
	recordSessionDevice,
	removeAccount,
	resolveRequestAccount,
	revokeAccountSession,
	revokeOtherAccountSessions,
	rotateSessionId,
	setActiveAccount,
	updateAccountTokens,
	writeSession
} from './session';
export type { AccountSession, Session, SessionData } from './session-model';
export {
	accountKey,
	bareAccount,
	dropAccount,
	getAccount,
	getActiveAccount,
	isSession,
	listAccounts,
	upsertAccount,
	withAccountTokens,
	withActiveAccount,
	wrapAccount
} from './session-model';
export { sealSession, unsealSession } from './session-crypto';
export {
	checkRateLimitRow,
	deleteSessionRow,
	getSessionRow,
	hasSessionRow,
	hasStepUpProof,
	importLegacySessionsJson,
	listSessionAccountRows,
	openStoreDb,
	pruneRateLimitRows,
	pruneSecurityRows,
	pruneSessionRows,
	putSessionRow,
	putStepUpProof,
	putTotpSetup,
	consumeTotpSetup,
	setSessionAccountDevice,
	syncSessionAccountRows,
	touchSessionRow
} from './store-db';
export type { RateLimitOutcome, SessionAccountRow, SessionRow } from './store-db';
export { getStoreDb, startStoreMaintenance } from './store-instance';
export {
	getStalwartOauthClientId,
	getStalwartOauthClientSecret,
	getStalwartOauthDiscovery,
	getStalwartOauthIssuer,
	getStalwartOauthRedirectUri,
	getStalwartOauthScopes,
	isPasswordLoginEnabled,
	isStalwartOauthEnabled
} from './oauth-config';
export type { StalwartOauthDiscovery } from './oauth-config';
export { exchangeOauthCode, OauthTokenError, refreshOauthTokens } from './oauth-token';
export type { OauthTokens } from './oauth-token';
export { createPkceChallenge } from './oauth-utils';
export {
	authenticateStalwartCredentials,
	StalwartAuthError
} from './stalwart-auth';
export type { CredentialAuthResult } from './stalwart-auth';
export { log } from './log';
