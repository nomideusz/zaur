// A sample ticket travels in its own QR code: the booking packed into the URL's
// hash, so a phone that scans it opens the ticket with no server and no storage.
export type Ticket = {
	title: string;
	start: number;
	minutes: number;
	people: number;
	/** Integer grosze, like the ledger. */
	total: number;
	refunded: number;
	ref: string;
};

export const ticketHash = '#ticket=';

export function encodeTicket(t: Ticket): string {
	const json = JSON.stringify([t.title.slice(0, 40), t.start, t.minutes, t.people, t.total, t.refunded, t.ref]);
	const bytes = new TextEncoder().encode(json);
	return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/** Anything can be typed into a hash, so only a well-formed ticket comes back. */
export function decodeTicket(code: string): Ticket | null {
	try {
		const binary = atob(code.replaceAll('-', '+').replaceAll('_', '/'));
		const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
		const [title, start, minutes, people, total, refunded, ref] = JSON.parse(new TextDecoder().decode(bytes));
		const counts = [start, minutes, people, total, refunded];
		if (typeof title !== 'string' || typeof ref !== 'string' || !counts.every((n) => Number.isFinite(n) && n >= 0)) return null;
		return { title: title.slice(0, 40), start, minutes, people, total, refunded, ref: ref.slice(0, 24) };
	} catch {
		return null;
	}
}
