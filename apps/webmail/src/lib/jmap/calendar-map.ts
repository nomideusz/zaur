import { parseIsoDuration } from '$lib/utils/dates';
import type { Calendar, CalendarEvent } from '$lib/types/calendar';
import type { JMAPCalendar, JMAPCalendarEvent } from './calendar-types';

const DEFAULT_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2'];

export function mapCalendar(calendar: JMAPCalendar, index: number): Calendar {
	return {
		id: calendar.id,
		name: calendar.name,
		color: calendar.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
		isDefault: calendar.isDefault ?? false,
		isVisible: calendar.isVisible ?? true
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
		return new Date(start.getTime() + parseIsoDuration(event.duration));
	}

	if (event.showWithoutTime) {
		return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
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

export function mapCalendarEvent(event: JMAPCalendarEvent): CalendarEvent {
	const start = parseEventStart(event);
	const end = parseEventEnd(event, start);

	return {
		id: event.id,
		calendarIds: Object.keys(event.calendarIds ?? {}),
		title: event.title?.trim() || '(No title)',
		description: event.description?.trim() || undefined,
		start,
		end,
		allDay: !!event.showWithoutTime,
		location: firstLocation(event)
	};
}
