import type { TimelineEvent } from '@nomideusz/svelte-calendar';
import type { Calendar, CalendarEvent } from '$lib/types/calendar';

/**
 * Maps JMAP CalendarEvent objects to TimelineEvent objects consumed by @nomideusz/svelte-calendar.
 */
export function mapJmapToTimelineEvents(
	events: CalendarEvent[],
	calendars: Calendar[]
): TimelineEvent[] {
	return events.map((event) => {
		const calendarId = event.calendarIds[0];
		const associatedCalendar = calendars.find((c) => c.id === calendarId);
		return {
			id: event.id,
			title: event.title || '(No title)',
			start: event.start,
			end: event.end,
			allDay: event.allDay,
			location: event.location,
			color: associatedCalendar?.color,
			category: associatedCalendar?.name
		};
	});
}
