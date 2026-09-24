/**
 * The call's geometry, order and wording, kept out of the components so they
 * can be tested without a room.
 */

/** Guests join under a throwaway identity with this prefix; the room marks them by it. */
export const GUEST_PREFIX = 'guest-';

/** Camera tiles are 16:10, the same as the design's stage. */
export const TILE_ASPECT = 16 / 10;

/**
 * `count` equal tiles in a `width` × `height` box: the column count that makes
 * each tile largest, and the tile size it gives.
 */
export function fitGrid(
	count: number,
	width: number,
	height: number,
	gap = 12,
	aspect = TILE_ASPECT
): { cols: number; w: number; h: number } {
	let best = { cols: 1, w: 0, h: 0 };
	for (let cols = 1; cols <= Math.max(1, count); cols++) {
		const rows = Math.ceil(count / cols);
		const w = Math.floor(Math.min((width - gap * (cols - 1)) / cols, ((height - gap * (rows - 1)) / rows) * aspect));
		if (w > best.w) best = { cols, w, h: Math.floor(w / aspect) };
	}
	return best;
}

export interface RosterEntry {
	isLocal: boolean;
	name: string;
	/** When the hand went up (ms), or null. */
	handSince: number | null;
}

/** People: you first, then raised hands in the order they went up, then everyone by name. */
export function rosterOrder<T extends RosterEntry>(people: T[]): T[] {
	return [...people].sort(
		(a, b) =>
			Number(b.isLocal) - Number(a.isLocal) ||
			(a.handSince ?? Infinity) - (b.handSince ?? Infinity) ||
			a.name.localeCompare(b.name)
	);
}

/** The lobby's line about who is already in. */
export function hereLine(names: string[]): string {
	const first = names.map((name) => name.split(/\s+/)[0] || name);
	if (first.length === 0) return 'No one else is here yet';
	if (first.length === 1) return `${first[0]} is here`;
	if (first.length === 2) return `${first[0]} and ${first[1]} are here`;
	const others = first.length - 2;
	return `${first[0]}, ${first[1]} and ${others} other${others === 1 ? '' : 's'} are here`;
}

/** Time in the call: 04:12, then 1:04:12 past the hour. */
export function formatElapsed(ms: number): string {
	const s = Math.max(0, Math.floor(ms / 1000));
	const pad = (n: number) => String(n).padStart(2, '0');
	const h = Math.floor(s / 3600);
	const tail = `${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
	return h ? `${h}:${tail}` : tail;
}

/** A camera or microphone that would not start, said the way the person can fix it. */
export function deviceProblem(cause: unknown, what: 'camera' | 'microphone'): string {
	const name = (cause as { name?: unknown } | null)?.name;
	if (name === 'NotAllowedError' || name === 'SecurityError') return `Your browser blocked the ${what}`;
	if (name === 'NotFoundError' || name === 'OverconstrainedError') return `No ${what} found`;
	if (name === 'NotReadableError') return `The ${what} is in use by another app`;
	return `Could not start the ${what}`;
}
