import { query, getRequestEvent } from '$app/server';
import { createConnectedClient } from '$lib/server/jmap';
import { accountKey, readAccountsById, readSessionFull } from '$lib/server/session';

const POLL_MS = 30_000;

/**
 * Live per-account inbox unread counts for the signed-in session. Streamed to the
 * client (one shared connection per tab) and updated on a server-side poll while the
 * app is open — drives the account-switcher badges and the summed OS app badge.
 */
export const unreadCounts = query.live(async function* () {
	const { cookies } = getRequestEvent();
	const session = readSessionFull(cookies);
	if (!session) {
		yield {} as Record<string, number>;
		return;
	}
	const sessionId = session.id;

	// Emit immediately so SSR/initial render isn't blocked on the per-account queries.
	yield {} as Record<string, number>;

	while (true) {
		const accounts = readAccountsById(sessionId);
		if (!accounts.length) return; // signed out elsewhere — end the stream

		const counts: Record<string, number> = {};
		for (const account of accounts) {
			try {
				// No cookies: refresh writes back to the session store only (can't set
				// cookies mid-stream), and the cookie is just the stable session id anyway.
				const client = await createConnectedClient(account);
				const mailboxes = await client.getMailboxes();
				const inbox = mailboxes.find((mailbox) => mailbox.role === 'inbox');
				counts[accountKey(account.username)] = inbox?.unreadEmails ?? 0;
			} catch {
				// Skip a dead/expired/transiently-failing account; others still report.
			}
		}

		yield counts;
		await new Promise((resolve) => setTimeout(resolve, POLL_MS));
	}
});
