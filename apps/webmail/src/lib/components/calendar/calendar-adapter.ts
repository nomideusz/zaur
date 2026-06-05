import type { CalendarAdapter, DateRange, TimelineEvent } from '@nomideusz/svelte-calendar';
import type { JMAPClient } from '$lib/jmap/client';
import { mapCalendarEvent } from '$lib/jmap/calendar-map';
import { expandRecurringEventInRange } from '$lib/jmap/recurrence';
import { calendar } from '$lib/stores/calendar.svelte';
import {
	isRecurringInstance,
	isSyntheticCalendarError,
	type CalendarEvent
} from '$lib/types/calendar';
import { toast } from '$lib/stores/toast.svelte';
import {
	durationBetween,
	formatJmapQueryBound,
	localTimeZone,
	pad2,
	toDateInputValue
} from '$lib/utils/dates';

function formatJmapStart(start: Date, allDay: boolean): string {
	if (allDay) return toDateInputValue(start);
	return `${toDateInputValue(start)}T${pad2(start.getHours())}:${pad2(start.getMinutes())}:00`;
}

function toTimelineEvent(event: CalendarEvent): TimelineEvent {
	const calendarId = event.calendarIds[0];
	const associatedCalendar = calendar.calendars.find((item) => item.id === calendarId);

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
}

const RECURRING_INSTANCE_MESSAGE =
	"Recurring events can't be moved individually on this server yet.";

/**
 * Adapter implementing the WritableCalendarAdapter interface from @nomideusz/svelte-calendar
 * to query JMAP calendar events dynamically for the visible range.
 */
export class ZaurCalendarAdapter implements CalendarAdapter {
	private client: JMAPClient;
	private cachedEvents = new Map<
		string,
		{ event: CalendarEvent; timelineEv: TimelineEvent; calendarId: string }
	>();
	private lastRefresh = -1;

	constructor(client: JMAPClient) {
		this.client = client;
	}

	async fetchEvents(range: DateRange): Promise<TimelineEvent[]> {
		const refresh = calendar.refreshCounter;
		if (refresh !== this.lastRefresh) {
			this.cachedEvents.clear();
			this.lastRefresh = refresh;
		}

		try {
			const { events } = await this.client.queryCalendarEvents({
				after: formatJmapQueryBound(range.start),
				before: formatJmapQueryBound(range.end),
				timeZone: localTimeZone()
			});

			const masters = events.map(mapCalendarEvent);
			const currentEventsMap = new Map(calendar.events.map((ev) => [ev.id, ev]));
			for (const ev of masters) {
				currentEventsMap.set(ev.id, ev);
			}
			calendar.events = Array.from(currentEventsMap.values());

			for (const master of masters) {
				const instances = expandRecurringEventInRange(master, range);
				for (const event of instances) {
					const calendarId = event.calendarIds[0];
					const timelineEv = toTimelineEvent(event);
					this.cachedEvents.set(event.id, { event, timelineEv, calendarId });
				}
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

	async updateEvent(id: string, patch: Partial<TimelineEvent>): Promise<TimelineEvent> {
		const cached = this.cachedEvents.get(id);
		let existing = calendar.events.find((event) => event.id === id) ?? cached?.event;

		if (!existing) {
			throw new Error(`Event not found: ${id}`);
		}

		if (isRecurringInstance(existing)) {
			toast.show(RECURRING_INSTANCE_MESSAGE, 'error');
			throw new Error(RECURRING_INSTANCE_MESSAGE);
		}

		const updateId = existing.id;
		const master =
			calendar.events.find((event) => event.id === updateId) ??
			(existing.recurrenceRule ? existing : undefined);

		if (!master) {
			throw new Error(`Event not found: ${updateId}`);
		}

		const calendarId = master.calendarIds[0];
		if (!calendarId) {
			throw new Error('Event has no calendar');
		}

		const nextStart = patch.start ?? existing.start;
		const nextEnd = patch.end ?? existing.end;
		if (nextEnd.getTime() <= nextStart.getTime()) {
			throw new Error('End must be after start');
		}

		const updated: CalendarEvent = {
			...master,
			title: patch.title?.trim() || master.title,
			start: nextStart,
			end: nextEnd,
			allDay: patch.allDay ?? master.allDay,
			location: patch.location ?? master.location
		};

		try {
			await this.client.updateCalendarEvent(updateId, {
				calendarId,
				title: updated.title,
				start: formatJmapStart(updated.start, updated.allDay),
				duration: durationBetween(updated.start, updated.end, updated.allDay),
				timeZone: localTimeZone(),
				showWithoutTime: updated.allDay,
				description: master.description,
				location: updated.location,
				previousCalendarIds: master.calendarIds
			});
		} catch (error) {
			if (isSyntheticCalendarError(error)) {
				toast.show(RECURRING_INSTANCE_MESSAGE, 'error');
				throw new Error(RECURRING_INSTANCE_MESSAGE);
			}
			const message = error instanceof Error ? error.message : 'Failed to move event';
			toast.show(message, 'error');
			throw error;
		}

		calendar.events = calendar.events.map((event) => (event.id === updateId ? updated : event));
		this.cachedEvents.clear();
		this.lastRefresh = -1;

		const timelineEv = toTimelineEvent(updated);
		return timelineEv;
	}
}
