import type { CalendarEvent } from '../types/calendar';
import { pad2, toDateInputValue } from '../utils/dates';

export type EventRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export const EVENT_REPEAT_OPTIONS: { value: EventRepeat; label: string }[] = [
	{ value: 'none', label: 'Does not repeat' },
	{ value: 'daily', label: 'Daily' },
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'monthly', label: 'Monthly' },
	{ value: 'yearly', label: 'Yearly' }
];

/** JSCalendar's weekday codes (RFC 8984 §4.3.3). */
export type WeekdayCode = 'mo' | 'tu' | 'we' | 'th' | 'fr' | 'sa' | 'su';

/** Monday first — the order the editor draws them in. */
export const WEEKDAYS: { code: WeekdayCode; label: string }[] = [
	{ code: 'mo', label: 'Mon' },
	{ code: 'tu', label: 'Tue' },
	{ code: 'we', label: 'Wed' },
	{ code: 'th', label: 'Thu' },
	{ code: 'fr', label: 'Fri' },
	{ code: 'sa', label: 'Sat' },
	{ code: 'su', label: 'Sun' }
];

export interface JmapNDay {
	'@type': 'NDay';
	day: WeekdayCode;
}

export interface JmapRecurrenceRule {
	'@type': 'RecurrenceRule';
	frequency: string;
	interval?: number;
	byDay?: JmapNDay[];
	until?: string;
	count?: number;
}

export type EventFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * A repeat rule as the editor holds it — the part of RFC 8984's
 * `RecurrenceRule` a person can actually be asked for. `EventRepeat` above is
 * the old bare-frequency form webmail 1.0 still writes; this is the one with
 * an interval, the weekdays a weekly rule lands on, and an end.
 */
export interface EventRecurrence {
	frequency: EventFrequency;
	/** 1 = every, 2 = every other. */
	interval: number;
	/** Weekly only. Empty means "the day the event already starts on". */
	byDay: WeekdayCode[];
	/** Local date-time, exclusive with `count`. */
	until?: string;
	/** Occurrences in total, counting the first. Exclusive with `until`. */
	count?: number;
}

export const WEEKDAY_OF_INDEX: WeekdayCode[] = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];

export function weekdayCodeOf(date: Date): WeekdayCode {
	return WEEKDAY_OF_INDEX[date.getDay()]!;
}

/** The rule a new event starts from: weekly on the day it is being created. */
export function defaultRecurrence(start: Date): EventRecurrence {
	return { frequency: 'weekly', interval: 1, byDay: [weekdayCodeOf(start)] };
}

/**
 * The editor's rule as JMAP wants it. `byDay` only travels on a weekly rule —
 * on a monthly one it would mean "the Mondays of that month", which is a
 * different rule from the one the editor is offering.
 */
export function recurrenceRuleFrom(
	recurrence: EventRecurrence | null
): JmapRecurrenceRule | undefined {
	if (!recurrence) return undefined;

	const rule: JmapRecurrenceRule = {
		'@type': 'RecurrenceRule',
		frequency: recurrence.frequency
	};
	if (recurrence.interval > 1) rule.interval = recurrence.interval;
	if (recurrence.frequency === 'weekly' && recurrence.byDay.length) {
		rule.byDay = recurrence.byDay.map((day) => ({ '@type': 'NDay', day }));
	}
	// A rule carries an end or a count, never both.
	if (recurrence.count !== undefined) rule.count = recurrence.count;
	else if (recurrence.until) rule.until = recurrence.until;
	return rule;
}

/** The other direction: what the server holds, as the editor holds it. */
export function recurrenceFrom(
	rule: JmapRecurrenceRule | undefined,
	start: Date
): EventRecurrence | null {
	if (!rule) return null;
	const frequency = (['daily', 'weekly', 'monthly', 'yearly'] as const).find(
		(known) => known === rule.frequency
	);
	if (!frequency) return null;

	return {
		frequency,
		interval: Math.max(1, rule.interval ?? 1),
		byDay: rule.byDay?.length
			? rule.byDay.map((day) => day.day)
			: frequency === 'weekly'
				? [weekdayCodeOf(start)]
				: [],
		until: rule.until,
		count: rule.count
	};
}

/** Stalwart / JMAP Calendars use singular `recurrenceRule`, not `recurrenceRules`. */
export function recurrenceRuleFor(repeat: EventRepeat): JmapRecurrenceRule | undefined {
	if (repeat === 'none') return undefined;

	return {
		'@type': 'RecurrenceRule',
		frequency: repeat
	};
}

function addRecurrenceInterval(date: Date, frequency: string, interval: number): Date {
	const next = new Date(date);

	switch (frequency) {
		case 'daily':
			next.setDate(next.getDate() + interval);
			break;
		case 'weekly':
			next.setDate(next.getDate() + 7 * interval);
			break;
		case 'monthly':
			next.setMonth(next.getMonth() + interval);
			break;
		case 'yearly':
			next.setFullYear(next.getFullYear() + interval);
			break;
		default:
			next.setDate(next.getDate() + interval);
	}

	return next;
}

function formatRecurrenceId(start: Date, allDay: boolean): string {
	if (allDay) return toDateInputValue(start);
	return `${toDateInputValue(start)}T${pad2(start.getHours())}:${pad2(start.getMinutes())}:${pad2(start.getSeconds())}`;
}

const MAX_EXPANSIONS = 500;

/** Expand a master recurring event into view instances (client-side). */
export function expandRecurringEventInRange(
	event: CalendarEvent,
	range: { start: Date; end: Date }
): CalendarEvent[] {
	if (!event.recurrenceRule) return [event];

	const rule = event.recurrenceRule;
	const interval = Math.max(1, rule.interval ?? 1);
	const durationMs = event.end.getTime() - event.start.getTime();
	const untilMs = rule.until ? new Date(rule.until).getTime() : null;

	const instances: CalendarEvent[] = [];
	let cursor = new Date(event.start);
	let generated = 0;

	while (cursor.getTime() < range.end.getTime() && generated < MAX_EXPANSIONS) {
		if (untilMs !== null && cursor.getTime() > untilMs) break;
		if (rule.count !== undefined && generated >= rule.count) break;

		const instanceEnd = new Date(cursor.getTime() + durationMs);
		if (cursor < range.end && instanceEnd > range.start) {
			const recurrenceId = formatRecurrenceId(cursor, event.allDay);
			instances.push({
				...event,
				id: `${event.id}~${recurrenceId}`,
				baseEventId: event.id,
				recurrenceId,
				start: new Date(cursor),
				end: instanceEnd
			});
		}

		cursor = addRecurrenceInterval(cursor, rule.frequency, interval);
		generated++;
	}

	return instances.length ? instances : [event];
}
