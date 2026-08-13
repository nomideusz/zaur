export interface JMAPCalendarRights {
	mayReadFreeBusy?: boolean;
	mayReadItems?: boolean;
	mayWriteAll?: boolean;
	mayWriteOwn?: boolean;
	mayUpdatePrivate?: boolean;
	mayRSVP?: boolean;
	mayShare?: boolean;
	mayDelete?: boolean;
}

export interface JMAPCalendar {
	id: string;
	name: string;
	description?: string | null;
	color?: string | null;
	isDefault?: boolean;
	isVisible?: boolean;
	isSubscribed?: boolean;
	sortOrder?: number;
	shareWith?: Record<string, JMAPCalendarRights> | null;
	myRights?: JMAPCalendarRights | null;
}

export interface JMAPPrincipal {
	id: string;
	type?: string;
	name: string;
	description?: string | null;
	email?: string | null;
}

export interface CalendarEventQueryResult {
	events: JMAPCalendarEvent[];
	total: number;
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
