import { browser } from '$app/environment';

export interface ContactEntry {
	email: string;
	name: string;
	count: number;
}

const STORAGE_PREFIX = 'zaur:contacts:';

function storageKey(accountId: string): string {
	return `${STORAGE_PREFIX}${accountId}`;
}

function readIndex(accountId: string): Map<string, ContactEntry> {
	if (!browser || !accountId) return new Map();

	try {
		const raw = localStorage.getItem(storageKey(accountId));
		if (!raw) return new Map();
		const entries = JSON.parse(raw) as ContactEntry[];
		return new Map(entries.map((entry) => [entry.email.toLowerCase(), entry]));
	} catch {
		return new Map();
	}
}

function writeIndex(accountId: string, index: Map<string, ContactEntry>) {
	if (!browser || !accountId) return;

	const entries = Array.from(index.values()).sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
	);
	localStorage.setItem(storageKey(accountId), JSON.stringify(entries));
}

export function recordContact(accountId: string, name: string, email: string) {
	const normalized = email.trim().toLowerCase();
	if (!normalized || !accountId) return;

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

export function recordContacts(
	accountId: string,
	addresses: { name: string; email: string }[]
) {
	for (const address of addresses) {
		recordContact(accountId, address.name, address.email);
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
