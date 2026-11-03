import type { Cookies } from '@sveltejs/kit';
import {
	deletePushSubscriptionsForSession,
	getStoreDb,
	removeAccount,
	type Session
} from '@zaur/server-auth';
import { pushWatcher } from '#lib/server/push-watcher';

/**
 * The server refused this account's credentials and a refresh could not mend
 * it: only signing in again will. An outage throws something else, and must
 * never sign anyone out.
 */
export function isSessionRejected(cause: unknown): boolean {
	return (
		cause instanceof Error &&
		(cause.message === 'Unauthorized' || cause.message === 'Invalid username or password')
	);
}

/** Sign one account out of this session; the last one ends the session. */
export function signOutOf(cookies: Cookies, session: Session, key: string): Session | null {
	const remaining = removeAccount(cookies, key);
	if (!remaining) deletePushSubscriptionsForSession(getStoreDb(), session.id);
	// The watcher re-reads the session's accounts, so the account stops notifying now.
	pushWatcher.sync();
	return remaining;
}
