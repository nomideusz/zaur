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

export interface JmapRecurrenceRule {
	'@type': 'RecurrenceRule';
	frequency: string;
	interval?: number;
	until?: string;
	count?: number;
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
