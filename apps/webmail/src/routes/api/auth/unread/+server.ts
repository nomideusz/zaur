import { json, type RequestHandler } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { accountKey, readSessionFull } from '$lib/server/session';

/** Coalesce rapid polls (multiple tabs / quick navigations) per session. */
const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { at: number; data: Record<string, number> }>();

export const GET: RequestHandler = async ({ cookies }) => {
	const session = readSessionFull(cookies);
	if (!session) {
		return json({ authenticated: false });
	}

	const now = Date.now();
	for (const [key, value] of cache) {
		if (now - value.at > CACHE_TTL_MS) cache.delete(key);
	}
	const cached = cache.get(session.id);
	if (cached) {
		return json({ unread: cached.data });
	}

	// Sequential: each connect may refresh tokens and write back to the session
	// store, so running them in parallel could clobber each other's updates.
	const unread: Record<string, number> = {};
	for (const account of session.accounts) {
		try {
			const client = await createConnectedClient({ ...account, id: session.id }, cookies);
			const mailboxes = await client.getMailboxes();
			const inbox = mailboxes.find((mailbox) => mailbox.role === 'inbox');
			unread[accountKey(account.username)] = inbox?.unreadEmails ?? 0;
		} catch {
			// Skip a dead/expired/transiently-failing account; others still report.
		}
	}

	cache.set(session.id, { at: now, data: unread });
	return json({ unread });
};
