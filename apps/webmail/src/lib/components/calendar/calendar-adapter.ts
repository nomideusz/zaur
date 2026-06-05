import type { CalendarAdapter, DateRange, TimelineEvent } from '@nomideusz/svelte-calendar';
import type { JMAPClient } from '$lib/jmap/client';
import { mapCalendarEvent } from '$lib/jmap/calendar-map';
import { calendar } from '$lib/stores/calendar.svelte';

/**
 * Adapter implementing the WritableCalendarAdapter interface from @nomideusz/svelte-calendar
 * to query JMAP calendar events dynamically for the visible range.
 */
export class ZaurCalendarAdapter implements CalendarAdapter {
	private client: JMAPClient;
	private cachedEvents = new Map<string, { timelineEv: TimelineEvent; calendarId: string }>();

	constructor(client: JMAPClient) {
		this.client = client;
	}

	async fetchEvents(range: DateRange): Promise<TimelineEvent[]> {
		try {
			const { events } = await this.client.queryCalendarEvents({
				after: range.start.toISOString(),
				before: range.end.toISOString()
			});

			const mappedEvents = events.map(mapCalendarEvent);
			const currentEventsMap = new Map(calendar.events.map((ev) => [ev.id, ev]));
			for (const ev of mappedEvents) {
				currentEventsMap.set(ev.id, ev);
			}
			calendar.events = Array.from(currentEventsMap.values());

			for (const rawEv of events) {
				const event = mapCalendarEvent(rawEv);
				const calendarId = event.calendarIds[0];
				const associatedCalendar = calendar.calendars.find((c) => c.id === calendarId);

				const timelineEv: TimelineEvent = {
					id: event.id,
					title: event.title || '(No title)',
					start: event.start,
					end: event.end,
					allDay: event.allDay,
					location: event.location,
					color: associatedCalendar?.color,
					category: associatedCalendar?.name
				};
				this.cachedEvents.set(timelineEv.id, { timelineEv, calendarId });
			}
		} catch (err) {
			console.error('Failed to fetch calendar events', err);
		}

		const results: TimelineEvent[] = [];
		for (const { timelineEv, calendarId } of this.cachedEvents.values()) {
			const overlaps = timelineEv.start < range.end && timelineEv.end > range.start;
			const isVisible = !calendar.hiddenCalendarIds.has(calendarId);

			if (overlaps && isVisible) {
				results.push(timelineEv);
			}
		}

		return results;
	}
}
