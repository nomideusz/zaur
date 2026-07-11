import type { MessageDetail } from '../types/mail';

export type ReaderDeliveredTo = {
	prefix: 'To' | 'From';
	addresses: string;
};

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function emailDomain(email: string): string | null {
	const normalized = normalizeEmail(email);
	const at = normalized.lastIndexOf('@');
	if (at < 0) return null;
	return normalized.slice(at + 1);
}

export function userOwnedAddresses(
	username: string | null | undefined,
	identities: readonly { email?: string | null }[]
): Set<string> {
	const owned = new Set<string>();
	const primary = username?.trim();
	if (primary) owned.add(normalizeEmail(primary));
	for (const identity of identities) {
		const email = identity.email?.trim();
		if (email) owned.add(normalizeEmail(email));
	}
	return owned;
}

function ownedDomains(ownedAddresses: Set<string>): Set<string> {
	const domains = new Set<string>();
	for (const email of ownedAddresses) {
		const domain = emailDomain(email);
		if (domain) domains.add(domain);
	}
	return domains;
}

function collectRecipientEmails(message: MessageDetail): string[] {
	const emails: string[] = [];
	const seen = new Set<string>();
	for (const recipients of [message.to, message.cc, message.bcc]) {
		for (const recipient of recipients ?? []) {
			const email = recipient.email?.trim();
			if (!email) continue;
			const key = normalizeEmail(email);
			if (seen.has(key)) continue;
			seen.add(key);
			emails.push(email);
		}
	}
	return emails;
}

function matchRecipients(
	message: MessageDetail,
	ownedAddresses: Set<string>,
	predicate: (email: string, key: string) => boolean
): string[] {
	const matches: string[] = [];
	const seen = new Set<string>();
	for (const email of collectRecipientEmails(message)) {
		const key = normalizeEmail(email);
		if (seen.has(key) || !predicate(email, key)) continue;
		seen.add(key);
		matches.push(email);
	}
	return matches;
}

/**
 * The address a reply should come from: the owned address the original message
 * was delivered to (so replying to mail sent to an alias replies from that alias).
 * Returns '' when no owned recipient matches — caller falls back to the primary.
 */
export function replyFromAddress(
	message: MessageDetail,
	username: string | null | undefined,
	identities: readonly { email?: string | null }[]
): string {
	const owned = userOwnedAddresses(username, identities);
	if (owned.size === 0) return '';

	for (const recipients of [message.to, message.cc, message.bcc]) {
		for (const recipient of recipients ?? []) {
			const email = recipient.email?.trim();
			if (!email || !owned.has(normalizeEmail(email))) continue;
			// Return the identity's canonical casing so the From picker matches an option.
			const identity = identities.find(
				(candidate) => candidate.email?.trim().toLowerCase() === normalizeEmail(email)
			);
			return identity?.email?.trim() ?? email;
		}
	}

	return '';
}

export function readerDeliveredTo(
	message: MessageDetail,
	ownedAddresses: Set<string>
): ReaderDeliveredTo | null {
	if (ownedAddresses.size === 0) return null;

	const fromEmail = message.from.email?.trim();
	if (!fromEmail) return null;

	if (ownedAddresses.has(normalizeEmail(fromEmail))) {
		return { prefix: 'From', addresses: fromEmail };
	}

	const domains = ownedDomains(ownedAddresses);
	const ownedMatches = matchRecipients(
		message,
		ownedAddresses,
		(_email, key) => ownedAddresses.has(key)
	);
	const catchAllMatches = matchRecipients(message, ownedAddresses, (email, key) => {
		if (ownedAddresses.has(key)) return false;
		const domain = emailDomain(email);
		return !!domain && domains.has(domain);
	});

	const addresses = [...catchAllMatches, ...ownedMatches];
	if (addresses.length) {
		return { prefix: 'To', addresses: addresses.join(', ') };
	}

	return null;
}
