import { browser } from '$app/environment';

export interface ContactEntry {
	email: string;
	name: string;
	count: number;
}

interface MessageLike {
	id: string;
	from?: { name?: string; email?: string } | null;
	to?: { name?: string; email?: string }[] | null;
	cc?: { name?: string; email?: string }[] | null;
}

// v2: the count is now distinct messages (deduped), not record calls. The bump resets
// the old inflated counters while migrating names/emails so autocomplete is preserved.
const STORAGE_PREFIX = 'zaur:contacts:v2:';
const LEGACY_PREFIX = 'zaur:contacts:';
const SEEN_PREFIX = 'zaur:contacts-seen:v2:';
/** Cap on remembered message ids per account so the seen-set can't grow without bound. */
const SEEN_CAP = 20000;

function storageKey(accountId: string): string {
	return `${STORAGE_PREFIX}${accountId}`;
}

function seenStorageKey(accountId: string): string {
	return `${SEEN_PREFIX}${accountId}`;
}

function readIndex(accountId: string): Map<string, ContactEntry> {
	if (!browser || !accountId) return new Map();

	try {
		const raw = localStorage.getItem(storageKey(accountId));
		if (raw) {
			const entries = JSON.parse(raw) as ContactEntry[];
			return new Map(entries.map((entry) => [entry.email.toLowerCase(), entry]));
		}
	} catch {
		return new Map();
	}

	// One-time migration: keep names/emails from the old index, reset the bad counts to 0.
	try {
		const legacy = localStorage.getItem(`${LEGACY_PREFIX}${accountId}`);
		if (legacy) {
			const entries = JSON.parse(legacy) as ContactEntry[];
			const migrated = new Map<string, ContactEntry>(
				entries.map((entry) => [
					entry.email.toLowerCase(),
					{ email: entry.email, name: entry.name, count: 0 }
				])
			);
			writeIndex(accountId, migrated);
			localStorage.removeItem(`${LEGACY_PREFIX}${accountId}`);
			return migrated;
		}
	} catch {
		// fall through to empty
	}

	return new Map();
}

function writeIndex(accountId: string, index: Map<string, ContactEntry>) {
	if (!browser || !accountId) return;

	const entries = Array.from(index.values()).sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
	);
	localStorage.setItem(storageKey(accountId), JSON.stringify(entries));
}

function readSeen(accountId: string): string[] {
	if (!browser || !accountId) return [];
	try {
		const raw = localStorage.getItem(seenStorageKey(accountId));
		return raw ? (JSON.parse(raw) as string[]) : [];
	} catch {
		return [];
	}
}

function writeSeen(accountId: string, order: string[]) {
	if (!browser || !accountId) return;
	const capped = order.length > SEEN_CAP ? order.slice(order.length - SEEN_CAP) : order;
	try {
		localStorage.setItem(seenStorageKey(accountId), JSON.stringify(capped));
	} catch {
		// Ignore storage quota issues.
	}
}

/** Manually add/bump a contact (e.g. the "add contact" form), independent of messages. */
export function recordContact(accountId: string, name: string, email: string) {
	const normalized = email.trim().toLowerCase();
	if (!browser || !normalized || !accountId) return;

	const index = readIndex(accountId);
	const existing = index.get(normalized);
	const displayName = name.trim() || email.trim();

	index.set(normalized, {
		email: email.trim(),
		name: existing?.name && existing.name !== existing.email ? existing.name : displayName,
		count: (existing?.count ?? 0) + 1
	});

	writeIndex(accountId, index);
}

/**
 * Index the participants of a batch of messages. Each message is counted at most once
 * (deduped by message id across calls) and each contact at most once per message, so the
 * "messages exchanged" count reflects distinct locally-seen messages — not how often the
 * UI happened to re-index them.
 */
export function recordMessages(
	accountId: string,
	messages: MessageLike[] | null | undefined
) {
	if (!browser || !accountId || !messages?.length) return;

	const index = readIndex(accountId);
	const order = readSeen(accountId);
	const seen = new Set(order);
	let changed = false;

	for (const message of messages) {
		const id = message?.id;
		if (!id || seen.has(id)) continue;
		seen.add(id);
		order.push(id);
		changed = true;

		// Dedupe participants within this message by email so to+cc+from count once.
		const participants = new Map<string, { name: string; email: string }>();
		const add = (addr?: { name?: string; email?: string } | null) => {
			const email = addr?.email?.trim();
			if (!email) return;
			const key = email.toLowerCase();
			if (!participants.has(key)) participants.set(key, { name: addr?.name?.trim() || email, email });
		};
		add(message.from);
		message.to?.forEach(add);
		message.cc?.forEach(add);

		for (const [key, participant] of participants) {
			const existing = index.get(key);
			index.set(key, {
				email: participant.email,
				name:
					existing?.name && existing.name !== existing.email ? existing.name : participant.name,
				count: (existing?.count ?? 0) + 1
			});
		}
	}

	if (changed) {
		writeIndex(accountId, index);
		writeSeen(accountId, order);
	}
}

export function listContacts(accountId: string | null, query = ''): ContactEntry[] {
	if (!accountId) return [];
	const needle = query.trim().toLowerCase();
	const contacts = Array.from(readIndex(accountId).values());

	if (!needle) {
		return contacts.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
	}

	return contacts
		.filter(
			(contact) =>
				contact.name.toLowerCase().includes(needle) || contact.email.toLowerCase().includes(needle)
		)
		.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export function removeContact(accountId: string, email: string): void {
	if (!browser || !accountId) return;

	const normalized = email.trim().toLowerCase();
	if (!normalized) return;

	const index = readIndex(accountId);
	if (!index.delete(normalized)) return;
	writeIndex(accountId, index);
}
