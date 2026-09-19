/**
 * The calendar's arithmetic: which events touch a day, how the month pages,
 * and what a repeat rule actually does. Placing events in a time grid used to
 * live here too; `@nomideusz/svelte-calendar` does that now, and does it with
 * drag and resize on top.
 */
import { WEEKDAYS, WEEKDAY_OF_INDEX, type EventRecurrence, type WeekdayCode } from '@zaur/mail-core';
import { startOfWeek } from '@zaur/mail-core/utils/dates';

const DAY_MS = 86_400_000;

export interface EventLike {
	start: Date;
	end: Date;
	allDay: boolean;
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
 * The same day, `delta` months away — clamped to the end of a short month.
 * Stepping a `Date` by a month rolls over instead (the 31st of January
 * becomes the 3rd of March), which makes paging a month view skip February.
 */
export function shiftMonth(date: Date, delta: number): Date {
	const target = new Date(date.getFullYear(), date.getMonth() + delta, 1);
	const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
	return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
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

function step(date: Date, recurrence: EventRecurrence, times: number): Date {
	const next = new Date(date);
	const by = recurrence.interval * times;
	if (recurrence.frequency === 'daily') next.setDate(next.getDate() + by);
	else if (recurrence.frequency === 'weekly') next.setDate(next.getDate() + 7 * by);
	else if (recurrence.frequency === 'monthly') next.setMonth(next.getMonth() + by);
	else next.setFullYear(next.getFullYear() + by);
	return next;
}

/** "every", "every other", "every 3rd" — the interval as English. */
function every(interval: number, unit: string): string {
	if (interval === 1) return `Every ${unit}`;
	if (interval === 2) return `Every other ${unit}`;
	return `Every ${ordinal(interval)} ${unit}`;
}

function listDays(days: WeekdayCode[]): string {
	const names = WEEKDAYS.filter((day) => days.includes(day.code)).map((day) => day.label);
	if (names.length <= 1) return names[0] ?? '';
	return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The next two dates a weekly rule lands on, which a bare interval cannot
 * say once the rule picks several days: "every other Tuesday and Thursday"
 * runs Tue, Thu, then skips a week.
 */
function nextWeeklyDates(recurrence: EventRecurrence, start: Date): Date[] {
	const wanted = new Set(recurrence.byDay);
	const out: Date[] = [];
	const cursor = new Date(start);
	// Counted between week starts, not between dates: an event on a Saturday
	// and the Monday three days later are a week apart, not zero, and a
	// fortnightly rule skips that Monday. RFC 5545's WKST defaults to Monday.
	const week0 = startOfWeek(start, 'monday').getTime();
	for (let i = 1; i <= 366 && out.length < 2; i++) {
		cursor.setDate(cursor.getDate() + 1);
		if (!wanted.has(WEEKDAY_OF_INDEX[cursor.getDay()]!)) continue;
		// Rounded, because a week across a DST change is not 7×24 hours.
		const weeks = Math.round((startOfWeek(cursor, 'monday').getTime() - week0) / (7 * DAY_MS));
		if (weeks % recurrence.interval !== 0) continue;
		out.push(new Date(cursor));
	}
	return out;
}

function describeEnd(recurrence: EventRecurrence): string {
	if (recurrence.count !== undefined) {
		return recurrence.count === 1 ? ', once' : `, ${recurrence.count} times`;
	}
	if (recurrence.until) {
		const until = new Date(recurrence.until);
		if (!Number.isNaN(until.getTime())) return ` until ${dayMonthLong.format(until)}`;
	}
	return '';
}

/**
 * One line saying what a repeat rule does, and — when the dates are not in
 * doubt — the two occurrences after the first, so a rule never has to be
 * guessed at. February has no 31st and no 29th most years: JMAP skips those
 * months, stepping a `Date` rolls over into the next one, and rather than
 * pick a lie those rules state themselves and list nothing.
 */
export function describeRepeat(recurrence: EventRecurrence | null, start: Date): string | null {
	if (!recurrence) return null;
	const day = start.getDate();

	if (recurrence.frequency === 'weekly' && recurrence.byDay.length) {
		const rule = `${every(recurrence.interval, 'week')} on ${listDays(recurrence.byDay)}`;
		const dates = nextWeeklyDates(recurrence, start);
		const then = dates.length === 2 ? ` · then ${dates.map((d) => dayMonth.format(d)).join(', ')}` : '';
		return `${rule}${describeEnd(recurrence)}${then}`;
	}

	const rule =
		recurrence.frequency === 'daily'
			? every(recurrence.interval, 'day')
			: recurrence.frequency === 'weekly'
				? `${every(recurrence.interval, 'week')} on ${weekdayName.format(start)}`
				: recurrence.frequency === 'monthly'
					? `${every(recurrence.interval, 'month')} on the ${ordinal(day)}`
					: `${every(recurrence.interval, 'year')} on ${dayMonthLong.format(start)}`;

	const certain =
		recurrence.frequency === 'daily' ||
		recurrence.frequency === 'weekly' ||
		(recurrence.frequency === 'monthly' ? day <= 28 : !(start.getMonth() === 1 && day === 29));
	if (!certain) return `${rule}${describeEnd(recurrence)}`;

	const then = `${dayMonth.format(step(start, recurrence, 1))}, ${dayMonth.format(step(start, recurrence, 2))}`;
	return `${rule}${describeEnd(recurrence)} · then ${then}`;
}
