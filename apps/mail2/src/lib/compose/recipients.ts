import type { ComposeContact, OutgoingRecipient, Recipient } from './types';

function cleanName(name: string): string {
	return name.trim().replace(/^["']+|["',]+$/g, '').trim();
}

/** Something either side of one `@`, and nothing a header would choke on. */
const ADDRESS_RE = /^[^\s@<>",;]+@[^\s@<>",;]+$/;

export interface SplitResult {
	recipients: Recipient[];
	/** What was not an address. It stays in the field, to be finished or removed. */
	rest: string;
}

/**
 * Read what was typed or pasted into an address field: one entry or a list,
 * separated by commas, semicolons, new lines or only spaces, each entry
 * `a@b.com`, `Name <a@b.com>` or `Name a@b.com`. Every commit path goes through
 * here — a pasted list used to become one chip named after all of it, and only
 * its last address got the mail. Deduped on the address.
 */
export function splitRecipients(text: string, meta = ''): SplitResult {
	const recipients: Recipient[] = [];
	const rest: string[] = [];
	const seen = new Set<string>();
	// A list with semicolons in it is Outlook's, where a comma is part of a name:
	// `Doe, Jane <j@x.io>; Smith, John <s@x.io>`. There, words before a comma
	// that came to no address wait for the one after it.
	const outlook = text.includes(';');
	// A group ends at a semicolon or a new line, an entry at a comma; a quoted
	// name may hold either ("Hobday, Annie").
	for (const group of text.match(/(?:"[^"]*"|[^;\n\r"]|")+/g) ?? []) {
		let name: string[] = [];
		for (const entry of group.match(/(?:"[^"]*"|[^,"]|")+/g) ?? []) {
			// Words, an <address> being one. Each address closes its entry, so
			// `a@x.io b@x.io` is two people and `Ada L ada@x.io` is one with a name.
			const words = entry.match(/<[^>]*>?|"[^"]*"|[^\s<"]+/g) ?? [];
			for (const [at, word] of words.entries()) {
				const angle = word.startsWith('<');
				// An address right before an <address> is that one's name: `john@work <john@x.io>`.
				if (!angle && (word.startsWith('"') || !word.includes('@') || words[at + 1]?.startsWith('<'))) {
					name.push(word);
					continue;
				}
				// As it is found in running text: (jane@x.io), mailto:a@x.io?subject=Hi, "write to a@x.io."
				const email = word
					.replace(/^[<(\[]+|[>)\].!?:]+$/g, '')
					.trim()
					.replace(/^mailto:([^?]*).*$/i, '$1');
				if (!ADDRESS_RE.test(email)) {
					rest.push([...name, word].join(' '));
				} else if (!seen.has(email.toLowerCase())) {
					seen.add(email.toLowerCase());
					recipients.push({ name: cleanName(name.join(' ')), email, meta });
				}
				name = [];
			}
			if (!name.length) continue;
			if (outlook) name = [`${name.join(' ')},`];
			else rest.push(name.splice(0).join(' '));
		}
		if (name.length) rest.push(name.join(' ').replace(/,$/, ''));
	}
	return { recipients, rest: rest.join(', ') };
}

/**
 * Turn whatever the user typed into one recipient chip. Understands
 * `a@b.com`, `Name <a@b.com>` and `Name a@b.com`. Returns null when the
 * text is not exactly one address (plain words only commit via a suggestion;
 * a list is `splitRecipients`).
 */
export function makeRecipient(text: string, meta = ''): Recipient | null {
	const { recipients, rest } = splitRecipients(text, meta);
	return recipients.length === 1 && !rest ? recipients[0]! : null;
}

export interface CommitResult {
	recipients: Recipient[];
	/** Text left in the input after the commit: what was typed that is not an address. */
	remaining: string;
}

/**
 * Commit the highlighted suggestion when one is active, else every address
 * in the typed text. Plain words without a suggestion commit nothing (per spec).
 */
export function commitRecipient(
	input: string,
	highlighted: ComposeContact | null,
	meta = ''
): CommitResult {
	if (highlighted) {
		return { recipients: [{ ...highlighted }], remaining: '' };
	}
	const { recipients, rest } = splitRecipients(input, meta);
	return { recipients, remaining: rest };
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
	return splitRecipients(text, meta).recipients;
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
/**
 * One chip per address, the first spelling kept. A list from outside (a draft
 * another client saved, a message with an address twice in To) may repeat one.
 */
export function uniqueRecipients(recipients: Recipient[]): Recipient[] {
	return recipients.filter((r, index) => recipients.findIndex((one) => one.email.toLowerCase() === r.email.toLowerCase()) === index);
}

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
