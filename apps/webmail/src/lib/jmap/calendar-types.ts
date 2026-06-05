export interface JMAPCalendar {
	id: string;
	name: string;
	color?: string | null;
	isDefault?: boolean;
	isVisible?: boolean;
	sortOrder?: number;
}

import type { JmapRecurrenceRule } from './recurrence';

export interface JMAPCalendarEvent {
	id: string;
	/** Present when `id` is a server-expanded recurrence instance. */
	baseEventId?: string | null;
	recurrenceId?: string | null;
	recurrenceRule?: JmapRecurrenceRule | null;
	recurrenceRules?: JmapRecurrenceRule[] | null;
	calendarIds?: Record<string, boolean>;
	title?: string;
	description?: string;
	start?: string;
	duration?: string;
	timeZone?: string;
	showWithoutTime?: boolean;
	utcStart?: string;
	utcEnd?: string;
	locations?: Record<string, { name?: string; description?: string }>;
}

export interface CalendarEventQueryResult {
	events: JMAPCalendarEvent[];
	total: number;
}
