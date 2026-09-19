/**
 * The calendar's arithmetic: which events touch a day, where they sit inside
 * it, and what a repeat rule actually does. Pure functions, so the time grid
 * is only geometry and the rules can be tested without a browser.
 */
import type { EventRepeat } from '@zaur/mail-core';

const DAY_MS = 86_400_000;

export interface EventLike {
	start: Date;
	end: Date;
	allDay: boolean;
}

export interface PlacedEvent<T> {
	event: T;
	/** Percentages of the day — straight into `top` and `height`. */
	top: number;
	height: number;
	/** Which column this event takes among the ones it overlaps, of how many. */
	lane: number;
	lanes: number;
	/** Runs past the edge of this day — the tile loses that corner. */
	continuesBefore: boolean;
	continuesAfter: boolean;
}

export function startOfDay(day: Date): Date {
	return new Date(day.getFullYear(), day.getMonth(), day.getDate());
}

/** Everything touching `day`, all-day first and then by start. */
export function eventsOnDay<T extends EventLike>(events: readonly T[], day: Date): T[] {
	const from = startOfDay(day).getTime();
	const to = from + DAY_MS;
	return events
		.filter((event) => event.start.getTime() < to && event.end.getTime() > from)
		.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.getTime() - b.start.getTime());
}

/**
 * Place a day's timed events in the grid. Events that overlap form a cluster
 * and share the width; a cluster is only as wide as it needs to be, so two
 * events at 09:00 do not narrow an unrelated one at 14:00. An event running
 * over midnight is clipped to this day and says so.
 */
export function placeDay<T extends EventLike>(events: readonly T[], day: Date): PlacedEvent<T>[] {
	const from = startOfDay(day).getTime();
	const to = from + DAY_MS;
	const timed = eventsOnDay(events, day)
		.filter((event) => !event.allDay)
		.sort((a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime());

	const placed: PlacedEvent<T>[] = [];
	let cluster: PlacedEvent<T>[] = [];
	let laneEnds: number[] = [];
	let clusterEnd = 0;

	function flush() {
		for (const item of cluster) item.lanes = laneEnds.length;
		placed.push(...cluster);
		cluster = [];
		laneEnds = [];
		clusterEnd = 0;
	}

	for (const event of timed) {
		const start = Math.max(event.start.getTime(), from);
		const end = Math.max(Math.min(event.end.getTime(), to), start);
		if (cluster.length && start >= clusterEnd) flush();

		let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
		if (lane === -1) lane = laneEnds.length;
		laneEnds[lane] = end;
		clusterEnd = Math.max(clusterEnd, end);

		cluster.push({
			event,
			top: ((start - from) / DAY_MS) * 100,
			height: ((end - start) / DAY_MS) * 100,
			lane,
			lanes: 1,
			continuesBefore: event.start.getTime() < from,
			continuesAfter: event.end.getTime() > to
		});
	}
	flush();
	return placed;
}

/**
 * The same day, `delta` months away — clamped to the end of a short month.
 * Stepping a `Date` by a month rolls over instead (the 31st of January
 * becomes the 3rd of March), which makes paging a month view skip February.
 */
export function shiftMonth(date: Date, delta: number): Date {
	const target = new Date(date.getFullYear(), date.getMonth() + delta, 1);
	const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
	return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

/** Where a moment sits in its day, as a percentage. Used for the now line. */
export function percentOfDay(at: Date): number {
	return ((at.getTime() - startOfDay(at).getTime()) / DAY_MS) * 100;
}

/* ── What a repeat rule means ─────────────────────────────────────────── */

const ORDINAL_SUFFIX: Record<Intl.LDMLPluralRule, string> = {
	zero: 'th',
	one: 'st',
	two: 'nd',
	few: 'rd',
	many: 'th',
	other: 'th'
};
const ordinals = new Intl.PluralRules('en', { type: 'ordinal' });
const weekdayName = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
const dayMonth = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const dayMonthLong = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' });

function ordinal(value: number): string {
	return `${value}${ORDINAL_SUFFIX[ordinals.select(value)]}`;
}

function step(date: Date, repeat: EventRepeat, times = 1): Date {
	const next = new Date(date);
	if (repeat === 'daily') next.setDate(next.getDate() + times);
	else if (repeat === 'weekly') next.setDate(next.getDate() + 7 * times);
	else if (repeat === 'monthly') next.setMonth(next.getMonth() + times);
	else if (repeat === 'yearly') next.setFullYear(next.getFullYear() + times);
	return next;
}

/**
 * One line saying what a repeat rule does, and — when the dates are not in
 * doubt — the two occurrences after the first, so "monthly" never has to be
 * guessed at. February has no 31st and no 29th most years: JMAP skips those
 * months, stepping a `Date` rolls over into the next one, and rather than
 * pick a lie those rules state themselves and list nothing.
 */
export function describeRepeat(repeat: EventRepeat, start: Date): string | null {
	if (repeat === 'none') return null;
	const day = start.getDate();

	const rule =
		repeat === 'daily'
			? 'Every day'
			: repeat === 'weekly'
				? `Every ${weekdayName.format(start)}`
				: repeat === 'monthly'
					? `Every month on the ${ordinal(day)}`
					: `Every ${dayMonthLong.format(start)}`;

	const certain =
		repeat === 'daily' ||
		repeat === 'weekly' ||
		(repeat === 'monthly' ? day <= 28 : !(start.getMonth() === 1 && day === 29));
	if (!certain) return rule;

	return `${rule} · then ${dayMonth.format(step(start, repeat))}, ${dayMonth.format(step(start, repeat, 2))}`;
}
