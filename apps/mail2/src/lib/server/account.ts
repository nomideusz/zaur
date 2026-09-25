/**
 * The signed-in account, for remote functions and endpoints alike. Always take
 * it from here: the account carries its session id, without which a refreshed
 * OAuth token cannot be saved (and the next refresh signs the user out).
 */
import { error } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import {
	accountKey,
	getActiveAccount,
	readSessionFull,
	type Session,
	type SessionData
} from '@zaur/server-auth';
import type { JMAPClient } from '@zaur/mail-core';
import { createConnectedClient } from '#lib/server/jmap';

export function requireSession(): { session: Session; account: SessionData } {
	const { cookies } = getRequestEvent();
	const session = readSessionFull(cookies);
	const account = session ? getActiveAccount(session) : undefined;
	if (!session || !account) error(401, 'Unauthorized');
	// readSessionFull leaves `id` off per-account records; the session gate
	// and the security store both key on it.
	return { session, account: { ...account, id: session.id } };
}

export function requireAccount(): SessionData {
	return requireSession().account;
}

export function requireAccountKey(): string {
	return accountKey(requireAccount().username);
}

export async function connect(account = requireAccount()): Promise<JMAPClient> {
	try {
		return await createConnectedClient(account);
	} catch (cause) {
		if (cause instanceof Error && cause.message === 'Unauthorized') error(401, 'Unauthorized');
		throw cause;
	}
}

/**
 * The client for one mail account: yours with no `account`, or a mailbox
 * someone shared with you, which the session has to list.
 */
export async function connectMail(account?: string | null): Promise<JMAPClient> {
	const client = await connect();
	if (!account) return client;
	return client.forAccount(String(account)) ?? error(404, 'That mailbox is not shared with you');
}

/**
 * A JMAP refusal (a subfolder in the way, a name already taken) is for the
 * person to read, so it goes back as a 400 with the server's words. Remote
 * functions hide the message of anything thrown that is not an `error()`.
 */
export function refuse(cause: unknown): never {
	if (cause instanceof Error) error(400, cause.message);
	throw cause;
}
