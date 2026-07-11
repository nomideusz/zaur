import type { JmapRecurrenceRule } from '../jmap/recurrence';

export interface Calendar {
	id: string;
	name: string;
	color: string;
	isDefault: boolean;
	isVisible: boolean;
}

export interface CalendarEvent {
	id: string;
	/** Set when this row is an expanded instance of a recurring event. */
	baseEventId?: string;
	recurrenceId?: string;
	recurrenceRule?: JmapRecurrenceRule;
	calendarIds: string[];
	title: string;
	description?: string;
	start: Date;
	end: Date;
	allDay: boolean;
	location?: string;
}

/**
 * Server-expanded occurrence of a recurring series (synthetic JMAP id).
 * Per JMAP Calendars, only synthetic ids carry baseEventId pointing at the master event.
 */
export function isRecurringInstance(
	event: Pick<CalendarEvent, 'id' | 'baseEventId'>
): boolean {
	return !!event.baseEventId && event.baseEventId !== event.id;
}

/** Stalwart rejects updates/deletes on synthetic recurrence instance ids. */
export function isSyntheticCalendarError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /synthetic/i.test(message);
}
