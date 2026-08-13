import { parseIsoDuration } from '../utils/dates';
import type { Calendar, CalendarEvent, CalendarRights } from '../types/calendar';
import type { JMAPCalendar, JMAPCalendarEvent } from './calendar-types';
import { CALENDAR_COLORS, normalizeCalendarRights } from './calendar-rights';
import type { JmapRecurrenceRule } from './recurrence';

export { CALENDAR_COLORS };

function mapShareWith(
	shareWith: JMAPCalendar['shareWith']
): Record<string, CalendarRights> | null {
	if (!shareWith) return null;

	const mapped: Record<string, CalendarRights> = {};
	for (const [principalId, rights] of Object.entries(shareWith)) {
		if (!rights) continue;
		mapped[principalId] = normalizeCalendarRights(rights);
	}
	return Object.keys(mapped).length ? mapped : null;
}

export function mapCalendar(
	calendar: JMAPCalendar,
	index: number,
	accountId?: string | null
): Calendar {
	return {
		id: calendar.id,
		name: calendar.name,
		color: calendar.color ?? CALENDAR_COLORS[index % CALENDAR_COLORS.length],
		description: calendar.description?.trim() || undefined,
		isDefault: calendar.isDefault ?? false,
		isVisible: calendar.isVisible ?? true,
		isSubscribed: calendar.isSubscribed ?? true,
		myRights: normalizeCalendarRights(calendar.myRights),
		shareWith: mapShareWith(calendar.shareWith),
		accountId: accountId ?? calendar.accountId ?? null
	};
}

function parseEventStart(event: JMAPCalendarEvent): Date {
	if (event.utcStart) return new Date(event.utcStart);

	if (event.start) {
		if (event.showWithoutTime) {
			const [datePart] = event.start.split('T');
			const [year, month, day] = datePart.split('-').map(Number);
			return new Date(year, month - 1, day);
		}

		return new Date(event.start);
	}

	return new Date();
}

function parseEventEnd(event: JMAPCalendarEvent, start: Date): Date {
	if (event.utcEnd) return new Date(event.utcEnd);

	if (event.duration) {
		const end = new Date(start.getTime() + parseIsoDuration(event.duration));
		// JMAP all-day events use exclusive end at midnight; keep that for overlap checks.
		if (event.showWithoutTime && end.getTime() <= start.getTime()) {
			return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
		}
		return end;
	}

	if (event.showWithoutTime) {
		return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
	}

	return new Date(start.getTime() + 60 * 60 * 1000);
}

function firstLocation(event: JMAPCalendarEvent): string | undefined {
	if (!event.locations) return undefined;
	for (const location of Object.values(event.locations)) {
		if (location.name) return location.name;
		if (location.description) return location.description;
	}
	return undefined;
}

function parseRecurrenceRule(event: JMAPCalendarEvent): JmapRecurrenceRule | undefined {
	if (event.recurrenceRule) return event.recurrenceRule;
	return event.recurrenceRules?.[0];
}

export function mapCalendarEvent(
	event: JMAPCalendarEvent,
	accountId?: string | null
): CalendarEvent {
	const start = parseEventStart(event);
	const end = parseEventEnd(event, start);

	return {
		id: event.id,
		accountId: accountId ?? event.accountId ?? null,
		baseEventId:
			event.baseEventId && event.baseEventId !== event.id ? event.baseEventId : undefined,
		recurrenceId:
			event.baseEventId && event.baseEventId !== event.id
				? (event.recurrenceId ?? undefined)
				: undefined,
		recurrenceRule: parseRecurrenceRule(event),
		calendarIds: Object.keys(event.calendarIds ?? {}),
		title: event.title?.trim() || '(No title)',
		description: event.description?.trim() || undefined,
		start,
		end,
		allDay: !!event.showWithoutTime,
		location: firstLocation(event)
	};
}
