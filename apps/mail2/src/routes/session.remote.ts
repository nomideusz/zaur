import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { command, query, getRequestEvent } from '$app/server';
import {
	accountKey,
	deletePushSubscriptionsForSession,
	getAccount,
	getActiveAccount,
	getStoreDb,
	readSessionFull,
	removeAccount,
	setActiveAccount
} from '@zaur/server-auth';
import { pushWatcher } from '#lib/server/push-watcher';

/**
 * Who is signed in — reads the session cookie through @zaur/server-auth.
 * Sessions are created by Mail 2.0's own login (login.remote.ts); the same
 * store/cookie is shared with webmail 1.0, so a 1.0 login also works here
 * and vice versa.
 */
export const whoami = query(async () => {
	const { cookies } = getRequestEvent();
	const session = readSessionFull(cookies);
	if (!session) return null;

	const current = getActiveAccount(session);
	if (!current) return null;

	return {
		sessionId: session.id,
		key: accountKey(current.username),
		username: current.username,
		displayName: current.displayName ?? null,
		accounts: session.accounts.map((account) => ({
			key: accountKey(account.username),
			username: account.username,
			displayName: account.displayName ?? null,
			authMethod: account.authMethod,
			active: accountKey(account.username) === accountKey(current.username)
		}))
	};
});

const key = v.object({ key: v.pipe(v.string(), v.minLength(1), v.maxLength(320)) });

/**
 * Make another signed-in account the active one. The session is shared, so
 * this also changes the account webmail 1.0 shows; the client reloads to drop
 * everything it had loaded for the previous account.
 */
export const switchAccount = command(key, async ({ key }) => {
	const { cookies } = getRequestEvent();
	const session = readSessionFull(cookies);
	if (!session) error(401, 'Unauthorized');
	if (!getAccount(session, key)) error(404, 'That account is not signed in here');
	setActiveAccount(cookies, key);
});

/** Sign one account out of this session; the last one ends the session. */
export const signOutAccount = command(key, async ({ key }) => {
	const { cookies } = getRequestEvent();
	const session = readSessionFull(cookies);
	if (!session) error(401, 'Unauthorized');
	const remaining = removeAccount(cookies, key);
	if (!remaining) deletePushSubscriptionsForSession(getStoreDb(), session.id);
	// The watcher re-reads the session's accounts, so the account stops notifying now.
	pushWatcher.sync();
	return { signedIn: remaining !== null };
});
