import type { JmapRecurrenceRule } from '../jmap/recurrence';

export interface CalendarRights {
	mayReadFreeBusy: boolean;
	mayReadItems: boolean;
	mayWriteAll: boolean;
	mayWriteOwn: boolean;
	mayUpdatePrivate: boolean;
	mayRSVP: boolean;
	mayShare: boolean;
	mayDelete: boolean;
}

export type CalendarShareRole = 'read' | 'write';

export interface Calendar {
	id: string;
	name: string;
	color: string;
	description?: string;
	isDefault: boolean;
	isVisible: boolean;
	isSubscribed: boolean;
	myRights: CalendarRights;
	shareWith: Record<string, CalendarRights> | null;
	/** JMAP account that owns this calendar. Shared calendars live in the sharer's account. */
	accountId: string | null;
}

export interface CalendarEvent {
	id: string;
	/** JMAP account this event belongs to (own or shared). */
	accountId: string | null;
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
