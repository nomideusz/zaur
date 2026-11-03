import type { Cookies } from '@sveltejs/kit';
import {
	deletePushSubscriptionsForSession,
	getStoreDb,
	removeAccount,
	type Session
} from '@zaur/server-auth';
import { pushWatcher } from '#lib/server/push-watcher';

/** Sign one account out of this session; the last one ends the session. */
export function signOutOf(cookies: Cookies, session: Session, key: string): Session | null {
	const remaining = removeAccount(cookies, key);
	if (!remaining) deletePushSubscriptionsForSession(getStoreDb(), session.id);
	// The watcher re-reads the session's accounts, so the account stops notifying now.
	pushWatcher.sync();
	return remaining;
}
