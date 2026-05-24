import type { JMAPClient } from '$lib/jmap/client';
import { mapCalendar, mapCalendarEvent } from '$lib/jmap/calendar-map';
import type { Calendar, CalendarEvent } from '$lib/types/calendar';
import { toast } from '$lib/stores/toast.svelte';
import {
	defaultEventTimes,
	durationBetween,
	isSameDay,
	localTimeZone,
	monthRange,
	parseDateInputValue,
	parseDatetimeLocalValue,
	toDateInputValue
} from '$lib/utils/dates';

export interface EventComposeDraft {
	calendarId: string;
	title: string;
	allDay: boolean;
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	location: string;
	description: string;
}

class CalendarStore {
	calendars = $state<Calendar[]>([]);
	events = $state<CalendarEvent[]>([]);
	hiddenCalendarIds = $state<Set<string>>(new Set());

	viewYear = $state(new Date().getFullYear());
	viewMonth = $state(new Date().getMonth());

	selectedEventId = $state<string | null>(null);

	composeOpen = $state(false);
	composeSaving = $state(false);
	composeError = $state<string | null>(null);
	composeDraft = $state<EventComposeDraft>(this.emptyDraft());

	calendarsLoading = $state(false);
	eventsLoading = $state(false);
	error = $state<string | null>(null);
	supported = $state<boolean | null>(null);

	private calendarsLoaded = false;

	private emptyDraft(day = new Date()): EventComposeDraft {
		const { start, end } = defaultEventTimes(day);
		const calendarId = this.defaultCalendarId() ?? '';
		return {
			calendarId,
			title: '',
			allDay: false,
			startDate: toDateInputValue(start),
			startTime: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`,
			endDate: toDateInputValue(end),
			endTime: `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
			location: '',
			description: ''
		};
	}

	defaultCalendarId(): string | undefined {
		return (
			this.calendars.find((calendar) => calendar.isDefault)?.id ?? this.calendars[0]?.id
		);
	}

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

	async loadMonth(client: JMAPClient, options?: { preserveSelection?: boolean }) {
		await this.ensureCalendars(client);
		if (!this.supported) return;

		this.eventsLoading = true;
		this.error = null;
		if (!options?.preserveSelection) {
			this.selectedEventId = null;
		}

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

	openCompose(day?: Date) {
		this.composeDraft = this.emptyDraft(day);
		if (!this.composeDraft.calendarId) {
			this.composeDraft.calendarId = this.defaultCalendarId() ?? '';
		}
		this.composeError = null;
		this.composeOpen = true;
	}

	closeCompose() {
		this.composeOpen = false;
		this.composeSaving = false;
		this.composeError = null;
	}

	private composeRange(): { start: Date; end: Date } {
		if (this.composeDraft.allDay) {
			const start = parseDateInputValue(this.composeDraft.startDate);
			const end = parseDateInputValue(this.composeDraft.endDate);
			return { start, end };
		}

		const start = parseDatetimeLocalValue(
			`${this.composeDraft.startDate}T${this.composeDraft.startTime}`
		);
		const end = parseDatetimeLocalValue(`${this.composeDraft.endDate}T${this.composeDraft.endTime}`);
		return { start, end };
	}

	async createEvent(client: JMAPClient): Promise<boolean> {
		const title = this.composeDraft.title.trim();
		if (!title) {
			this.composeError = 'Title is required';
			return false;
		}
		if (!this.composeDraft.calendarId) {
			this.composeError = 'Choose a calendar';
			return false;
		}

		const { start, end } = this.composeRange();
		if (end.getTime() <= start.getTime()) {
			this.composeError = 'End must be after start';
			return false;
		}

		this.composeSaving = true;
		this.composeError = null;

		const timeZone = localTimeZone();
		const allDay = this.composeDraft.allDay;
		const startValue = allDay
			? toDateInputValue(start)
			: `${toDateInputValue(start)}T${this.composeDraft.startTime}:00`;

		try {
			const id = await client.createCalendarEvent({
				calendarId: this.composeDraft.calendarId,
				title,
				start: startValue,
				duration: durationBetween(start, end, allDay),
				timeZone,
				showWithoutTime: allDay,
				description: this.composeDraft.description.trim() || undefined,
				location: this.composeDraft.location.trim() || undefined
			});

			this.closeCompose();
			toast.show(`"${title}" created`, 'success');

			if (start.getFullYear() !== this.viewYear || start.getMonth() !== this.viewMonth) {
				this.viewYear = start.getFullYear();
				this.viewMonth = start.getMonth();
			}

			await this.loadMonth(client, { preserveSelection: true });
			this.selectedEventId = id;
			return true;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to create event';
			this.composeError = message;
			toast.show(message, 'error');
			return false;
		} finally {
			this.composeSaving = false;
		}
	}

	async deleteEvent(client: JMAPClient, event: CalendarEvent): Promise<boolean> {
		if (!confirm(`Delete "${event.title}"?`)) return false;

		try {
			await client.destroyCalendarEvent(event.id);
			if (this.selectedEventId === event.id) {
				this.selectedEventId = null;
			}
			this.events = this.events.filter((item) => item.id !== event.id);
			toast.show(`"${event.title}" deleted`, 'success');
			return true;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to delete event';
			toast.show(message, 'error');
			return false;
		}
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
		this.composeOpen = false;
		this.composeSaving = false;
		this.composeError = null;
		this.composeDraft = this.emptyDraft();
		this.calendarsLoading = false;
		this.eventsLoading = false;
		this.error = null;
		this.supported = null;
		this.calendarsLoaded = false;
	}
}

export const calendar = new CalendarStore();
