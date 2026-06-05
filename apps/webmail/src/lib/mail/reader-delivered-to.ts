import type { MessageDetail } from '$lib/types/mail';

export type ReaderDeliveredTo = {
	prefix: 'To' | 'From';
	addresses: string;
};

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
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

	const matches: string[] = [];
	const seen = new Set<string>();
	for (const recipients of [message.to, message.cc, message.bcc]) {
		for (const recipient of recipients ?? []) {
			const email = recipient.email?.trim();
			if (!email) continue;
			const key = normalizeEmail(email);
			if (!ownedAddresses.has(key) || seen.has(key)) continue;
			seen.add(key);
			matches.push(email);
		}
	}

	if (!matches.length) return null;
	return { prefix: 'To', addresses: matches.join(', ') };
}
