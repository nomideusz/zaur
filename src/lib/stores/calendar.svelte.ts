import type { JMAPClient } from '$lib/jmap/client';
import { mapCalendar, mapCalendarEvent } from '$lib/jmap/calendar-map';
import type { Calendar, CalendarEvent } from '$lib/types/calendar';
import { isSameDay, localTimeZone, monthRange } from '$lib/utils/dates';

class CalendarStore {
	calendars = $state<Calendar[]>([]);
	events = $state<CalendarEvent[]>([]);
	hiddenCalendarIds = $state<Set<string>>(new Set());

	viewYear = $state(new Date().getFullYear());
	viewMonth = $state(new Date().getMonth());

	selectedEventId = $state<string | null>(null);

	calendarsLoading = $state(false);
	eventsLoading = $state(false);
	error = $state<string | null>(null);
	supported = $state<boolean | null>(null);

	private calendarsLoaded = false;

	async ensureCalendars(client: JMAPClient) {
		if (this.calendarsLoaded) return;

		this.calendarsLoading = true;
		this.error = null;

		try {
			if (!client.hasCalendars()) {
				this.supported = false;
				this.calendars = [];
				return;
			}

			this.supported = true;
			const list = await client.getCalendars();
			this.calendars = list.map(mapCalendar);
			this.hiddenCalendarIds = new Set(
				this.calendars.filter((calendar) => !calendar.isVisible).map((calendar) => calendar.id)
			);
			this.calendarsLoaded = true;
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to load calendars';
			this.calendars = [];
		} finally {
			this.calendarsLoading = false;
		}
	}

	async loadMonth(client: JMAPClient) {
		await this.ensureCalendars(client);
		if (!this.supported) return;

		this.eventsLoading = true;
		this.error = null;
		this.selectedEventId = null;

		const { after, before } = monthRange(this.viewYear, this.viewMonth);

		try {
			const { events } = await client.queryCalendarEvents({
				after,
				before,
				timeZone: localTimeZone()
			});
			this.events = events.map(mapCalendarEvent);
		} catch (error) {
			this.events = [];
			this.error = error instanceof Error ? error.message : 'Failed to load events';
		} finally {
			this.eventsLoading = false;
		}
	}

	visibleEvents = $derived.by(() => {
		if (!this.hiddenCalendarIds.size) return this.events;
		return this.events.filter((event) =>
			event.calendarIds.some((id) => !this.hiddenCalendarIds.has(id))
		);
	});

	selectedEvent = $derived.by(() => {
		if (!this.selectedEventId) return null;
		return this.visibleEvents.find((event) => event.id === this.selectedEventId) ?? null;
	});

	calendarById(id: string): Calendar | undefined {
		return this.calendars.find((calendar) => calendar.id === id);
	}

	eventsForDay(day: Date): CalendarEvent[] {
		return this.visibleEvents
			.filter((event) => isSameDay(event.start, day))
			.sort((a, b) => a.start.getTime() - b.start.getTime());
	}

	isCalendarVisible(id: string): boolean {
		return !this.hiddenCalendarIds.has(id);
	}

	toggleCalendar(id: string) {
		const next = new Set(this.hiddenCalendarIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		this.hiddenCalendarIds = next;

		if (this.selectedEventId) {
			const selected = this.events.find((event) => event.id === this.selectedEventId);
			if (selected && selected.calendarIds.every((calendarId) => next.has(calendarId))) {
				this.selectedEventId = null;
			}
		}
	}

	selectEvent(id: string | null) {
		this.selectedEventId = id;
	}

	goToToday() {
		const today = new Date();
		this.viewYear = today.getFullYear();
		this.viewMonth = today.getMonth();
	}

	prevMonth() {
		if (this.viewMonth === 0) {
			this.viewYear -= 1;
			this.viewMonth = 11;
			return;
		}
		this.viewMonth -= 1;
	}

	nextMonth() {
		if (this.viewMonth === 11) {
			this.viewYear += 1;
			this.viewMonth = 0;
			return;
		}
		this.viewMonth += 1;
	}

	reset() {
		this.calendars = [];
		this.events = [];
		this.hiddenCalendarIds = new Set();
		this.viewYear = new Date().getFullYear();
		this.viewMonth = new Date().getMonth();
		this.selectedEventId = null;
		this.calendarsLoading = false;
		this.eventsLoading = false;
		this.error = null;
		this.supported = null;
		this.calendarsLoaded = false;
	}
}

export const calendar = new CalendarStore();
