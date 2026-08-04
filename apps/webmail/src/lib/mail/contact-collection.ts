import type { MailboxRole } from '$lib/types/mail';

/**
 * Who becomes an auto-collected contact.
 *
 * People you have corresponded with — recipients of mail you sent, and the
 * other participants of threads you took part in. Indexing every message that
 * scrolled past filled the address book with newsletters, no-reply senders,
 * and every spammer in Junk, because nothing checked where the messages came
 * from. Manual adds are unaffected; this only governs harvesting.
 */

/** Mailboxes whose plain message list may be harvested. Sent only. */
export function collectsFromMailbox(role: MailboxRole | undefined): boolean {
	return role === 'sent';
}

/** Lower-cased, blank-free set of the account's own addresses. */
export function ownAddressSet(emails: Iterable<string | undefined | null>): Set<string> {
	const own = new Set<string>();
	for (const email of emails) {
		const trimmed = email?.trim().toLowerCase();
		if (trimmed) own.add(trimmed);
	}
	return own;
}

/**
 * True when a message in the thread was sent from one of the account's own
 * addresses — the signal that you took part rather than merely received it.
 * Without this, opening a spam message would file its sender.
 */
export function threadInvolvesOwner(
	thread: ReadonlyArray<{ from?: { email?: string } | null }>,
	own: ReadonlySet<string>
): boolean {
	if (own.size === 0) return false;
	return thread.some((message) => {
		const from = message.from?.email?.trim().toLowerCase();
		return !!from && own.has(from);
	});
}
