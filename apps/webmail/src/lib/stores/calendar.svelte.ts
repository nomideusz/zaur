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
	pad2,
	parseDateInputValue,
	parseDatetimeLocalValue,
	toDateInputValue
} from '$lib/utils/dates';

export type EventComposeMode = 'create' | 'edit';

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
	refreshCounter = $state(0);

	composeOpen = $state(false);
	composeMode = $state<EventComposeMode>('create');
	composeEventId = $state<string | null>(null);
	composePreviousCalendarIds = $state<string[]>([]);
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
			startTime: `${pad2(start.getHours())}:${pad2(start.getMinutes())}`,
			endDate: toDateInputValue(end),
			endTime: `${pad2(end.getHours())}:${pad2(end.getMinutes())}`,
			location: '',
			description: ''
		};
	}

	private draftFromEvent(event: CalendarEvent): EventComposeDraft {
		return {
			calendarId: event.calendarIds[0] ?? this.defaultCalendarId() ?? '',
			title: event.title === '(No title)' ? '' : event.title,
			allDay: event.allDay,
			startDate: toDateInputValue(event.start),
			startTime: `${pad2(event.start.getHours())}:${pad2(event.start.getMinutes())}`,
			endDate: toDateInputValue(event.end),
			endTime: `${pad2(event.end.getHours())}:${pad2(event.end.getMinutes())}`,
			location: event.location ?? '',
			description: event.description ?? ''
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
		this.composeMode = 'create';
		this.composeEventId = null;
		this.composePreviousCalendarIds = [];
		this.composeDraft = this.emptyDraft(day);
		if (!this.composeDraft.calendarId) {
			this.composeDraft.calendarId = this.defaultCalendarId() ?? '';
		}
		this.composeError = null;
		this.composeOpen = true;
	}

	openComposeEdit(event: CalendarEvent) {
		this.composeMode = 'edit';
		this.composeEventId = event.id;
		this.composePreviousCalendarIds = [...event.calendarIds];
		this.composeDraft = this.draftFromEvent(event);
		this.composeError = null;
		this.composeOpen = true;
	}

	closeCompose() {
		this.composeOpen = false;
		this.composeMode = 'create';
		this.composeEventId = null;
		this.composePreviousCalendarIds = [];
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

	private validateCompose():
		| { ok: true; title: string; start: Date; end: Date }
		| { ok: false; error: string } {
		const title = this.composeDraft.title.trim();
		if (!title) return { ok: false, error: 'Title is required' };
		if (!this.composeDraft.calendarId) return { ok: false, error: 'Choose a calendar' };

		const { start, end } = this.composeRange();
		if (end.getTime() <= start.getTime()) {
			return { ok: false, error: 'End must be after start' };
		}

		return { ok: true, title, start, end };
	}

	private composePayload(title: string, start: Date, end: Date) {
		const allDay = this.composeDraft.allDay;
		return {
			calendarId: this.composeDraft.calendarId,
			title,
			start: allDay
				? toDateInputValue(start)
				: `${toDateInputValue(start)}T${this.composeDraft.startTime}:00`,
			duration: durationBetween(start, end, allDay),
			timeZone: localTimeZone(),
			showWithoutTime: allDay,
			description: this.composeDraft.description.trim() || undefined,
			location: this.composeDraft.location.trim() || undefined
		};
	}

	private async afterSave(
		client: JMAPClient,
		title: string,
		start: Date,
		eventId: string,
		mode: EventComposeMode
	) {
		this.closeCompose();
		toast.show(`"${title}" ${mode === 'edit' ? 'updated' : 'created'}`, 'success');

		if (start.getFullYear() !== this.viewYear || start.getMonth() !== this.viewMonth) {
			this.viewYear = start.getFullYear();
			this.viewMonth = start.getMonth();
		}

		await this.loadMonth(client, { preserveSelection: true });
		this.selectedEventId = eventId;
		this.refreshCounter++;
	}

	async saveCompose(client: JMAPClient): Promise<boolean> {
		const validated = this.validateCompose();
		if (!validated.ok) {
			this.composeError = validated.error;
			return false;
		}

		this.composeSaving = true;
		this.composeError = null;

		const payload = this.composePayload(validated.title, validated.start, validated.end);

		try {
			if (this.composeMode === 'edit') {
				if (!this.composeEventId) throw new Error('No event selected');
				const eventId = this.composeEventId;
				await client.updateCalendarEvent(eventId, {
					...payload,
					previousCalendarIds: this.composePreviousCalendarIds
				});
				await this.afterSave(client, validated.title, validated.start, eventId, 'edit');
				return true;
			}

			const id = await client.createCalendarEvent(payload);
			await this.afterSave(client, validated.title, validated.start, id, 'create');
			return true;
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: this.composeMode === 'edit'
						? 'Failed to update event'
						: 'Failed to create event';
			this.composeError = message;
			toast.show(message, 'error');
			return false;
		} finally {
			this.composeSaving = false;
		}
	}

	async createEvent(client: JMAPClient): Promise<boolean> {
		return this.saveCompose(client);
	}

	async deleteEvent(client: JMAPClient, event: CalendarEvent): Promise<boolean> {
		if (!confirm(`Delete "${event.title}"?`)) return false;

		try {
			await client.destroyCalendarEvent(event.id);
			if (this.selectedEventId === event.id) {
				this.selectedEventId = null;
			}
			this.events = this.events.filter((item) => item.id !== event.id);
			this.refreshCounter++;
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
		this.refreshCounter = 0;
		this.hiddenCalendarIds = new Set();
		this.viewYear = new Date().getFullYear();
		this.viewMonth = new Date().getMonth();
		this.selectedEventId = null;
		this.composeOpen = false;
		this.composeMode = 'create';
		this.composeEventId = null;
		this.composePreviousCalendarIds = [];
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
