export interface JMAPCalendar {
	id: string;
	name: string;
	color?: string | null;
	isDefault?: boolean;
	isVisible?: boolean;
	sortOrder?: number;
}

export interface JMAPCalendarEvent {
	id: string;
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
