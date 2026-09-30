import type { ComposeContact, OutgoingRecipient, Recipient } from './types';

const ANGLE_RE = /^(.*)<([^>]+)>$/;

function cleanName(name: string): string {
	return name.trim().replace(/^["']+|["']+$/g, '').trim();
}

/**
 * Turn whatever the user typed into a recipient chip. Understands
 * `a@b.com`, `Name <a@b.com>` and `Name a@b.com`. Returns null when the
 * text has no address in it (plain words only commit via a suggestion).
 */
export function makeRecipient(text: string, meta = ''): Recipient | null {
	const cleaned = text.trim().replace(/[;,]+$/, '').trim();
	if (!cleaned) return null;

	let name = '';
	let email = cleaned;
	const angle = ANGLE_RE.exec(cleaned);
	if (angle) {
		name = cleanName(angle[1] ?? '');
		email = (angle[2] ?? '').trim();
	} else if (/\s/.test(cleaned) && cleaned.includes('@')) {
		const at = cleaned.lastIndexOf(' ');
		const candidate = cleaned.slice(at + 1).trim();
		if (candidate.includes('@')) {
			name = cleanName(cleaned.slice(0, at));
			email = candidate;
		}
	}

	if (!email || !email.includes('@') || /\s/.test(email)) return null;
	return { name, email, meta };
}

export interface CommitResult {
	recipient: Recipient | null;
	/** Text left in the input after the commit (always empty today). */
	remaining: string;
}

/**
 * Commit the highlighted suggestion when one is active, else the typed
 * text when it contains an address. Plain words without a suggestion
 * commit nothing (per spec).
 */
export function commitRecipient(
	input: string,
	highlighted: ComposeContact | null,
	meta = ''
): CommitResult {
	if (highlighted) {
		return { recipient: { ...highlighted }, remaining: '' };
	}
	return { recipient: makeRecipient(input, meta), remaining: '' };
}

/**
 * The suggestion a key (Enter, Tab, a comma) may commit: the one highlighted in
 * a list that is open, so the one the user can see. A closed list has none —
 * its first row is whoever sorts first in the address book, and committing it
 * added a stranger to a message from an empty field.
 */
export function highlightedSuggestion(
	open: boolean,
	suggestions: ComposeContact[],
	index: number
): ComposeContact | null {
	return open ? (suggestions[index] ?? null) : null;
}

/** Split an address list — typed, pasted, or stored on a server draft — into chips. */
export function parseRecipients(text: string, meta = ''): Recipient[] {
	const out: Recipient[] = [];
	const seen = new Set<string>();
	for (const part of text.split(/[,;]+/)) {
		const recipient = makeRecipient(part, meta);
		if (!recipient) continue;
		const key = recipient.email.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(recipient);
	}
	return out;
}

/** Split a text field into recipient emails for the send payload. */
export function parseAddressList(text: string): string[] {
	return parseRecipients(text).map((recipient) => recipient.email);
}

/**
 * A chip list for the wire, deduped on the address. The name a chip shows goes
 * with it, so the recipient is "Annie Hobday" <annie@…> in the header too.
 */
export function outgoingRecipients(list: Recipient[]): OutgoingRecipient[] {
	const out: OutgoingRecipient[] = [];
	const seen = new Set<string>();
	for (const recipient of list) {
		const email = recipient.email.trim();
		if (!email) continue;
		const key = email.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		const name = recipient.name.trim();
		out.push(name && name !== email ? { name, email } : { email });
	}
	return out;
}

/** Case-insensitive email dedupe across a chip list + a candidate. */
export function isDuplicate(recipients: Recipient[], email: string): boolean {
	const key = email.toLowerCase();
	return recipients.some((r) => r.email.toLowerCase() === key);
}

export function filterContacts(
	contacts: ComposeContact[],
	query: string,
	existing: Recipient[],
	limit = 8
): ComposeContact[] {
	const q = query.trim().toLowerCase();
	const matched = contacts.filter((contact) => {
		if (isDuplicate(existing, contact.email)) return false;
		if (!q) return true;
		return (
			contact.name.toLowerCase().includes(q) || contact.email.toLowerCase().includes(q)
		);
	});
	return matched.slice(0, limit);
}
