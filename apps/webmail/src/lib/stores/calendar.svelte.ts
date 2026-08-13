import { errorMessage } from '@zaur/mail-core/utils/errors';
import { isJmapMethodError } from '@zaur/mail-core/jmap/errors';
import type { JMAPClient } from '$lib/jmap/client';
import { mapCalendar, mapCalendarEvent } from '$lib/jmap/calendar-map';
import {
	calendarAllowsWrites,
	calendarDeleteBlockedReason,
	calendarKey,
	eventIsVisibleOnCalendars,
	eventKey,
	nextCalendarColor,
	patchShareWith,
	rightsForShareRole
} from '$lib/jmap/calendar-rights';
import { expandRecurringEventInRange, recurrenceRuleFor, type EventRepeat } from '$lib/jmap/recurrence';
import {
	isSyntheticCalendarError,
	type Calendar,
	type CalendarEvent,
	type CalendarRights,
	type CalendarShareRole
} from '$lib/types/calendar';
import { toast } from '$lib/stores/toast.svelte';
import {
	allDayInclusiveEnd,
	defaultEventTimes,
	durationBetween,
	localTimeZone,
	monthRange,
	pad2,
	parseDateInputValue,
	parseDatetimeLocalValue,
	toDateInputValue
} from '$lib/utils/dates';

export type EventComposeMode = 'create' | 'edit';

export type CalendarViewTab = 'week' | 'day' | 'agendas';

export interface EventComposeDraft {
	calendarId: string;
	title: string;
	allDay: boolean;
	repeat: EventRepeat;
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	location: string;
	description: string;
}

function createEmptyDraft(day = new Date(), calendarId = ''): EventComposeDraft {
	const { start, end } = defaultEventTimes(day);
	return {
		calendarId,
		title: '',
		allDay: false,
		repeat: 'none',
		startDate: toDateInputValue(start),
		startTime: `${pad2(start.getHours())}:${pad2(start.getMinutes())}`,
		endDate: toDateInputValue(end),
		endTime: `${pad2(end.getHours())}:${pad2(end.getMinutes())}`,
		location: '',
		description: ''
	};
}

class CalendarStore {
	calendars = $state<Calendar[]>([]);
	events = $state<CalendarEvent[]>([]);
	hiddenCalendarIds = $state<Set<string>>(new Set());

	viewYear = $state(new Date().getFullYear());
	viewMonth = $state(new Date().getMonth());
	activeView = $state<CalendarViewTab>('week');

	selectedEventId = $state<string | null>(null);
	refreshCounter = $state(0);

	composeOpen = $state(false);
	composeMode = $state<EventComposeMode>('create');
	composeEventId = $state<string | null>(null);
	composePreviousCalendarIds = $state<string[]>([]);
	composeSaving = $state(false);
	composeError = $state<string | null>(null);
	composeDraft = $state<EventComposeDraft>(createEmptyDraft());

	calendarsLoading = $state(false);
	eventsLoading = $state(false);
	error = $state<string | null>(null);
	supported = $state<boolean | null>(null);

	private calendarsLoaded = false;

	private emptyDraft(day = new Date()): EventComposeDraft {
		return createEmptyDraft(day, this.defaultCalendarId() ?? '');
	}

	private draftFromEvent(event: CalendarEvent): EventComposeDraft {
		const inclusiveEnd = event.allDay ? allDayInclusiveEnd(event.start, event.end) : event.end;

		return {
			calendarId: event.calendarIds[0] ?? this.defaultCalendarId() ?? '',
			title: event.title === '(No title)' ? '' : event.title,
			allDay: event.allDay,
			repeat: 'none',
			startDate: toDateInputValue(event.start),
			startTime: `${pad2(event.start.getHours())}:${pad2(event.start.getMinutes())}`,
			endDate: toDateInputValue(inclusiveEnd),
			endTime: `${pad2(inclusiveEnd.getHours())}:${pad2(inclusiveEnd.getMinutes())}`,
			location: event.location ?? '',
			description: event.description ?? ''
		};
	}

	writableCalendars = $derived(this.calendars.filter(calendarAllowsWrites));

	defaultCalendarId(): string | undefined {
		const writable = this.writableCalendars;
		return writable.find((item) => item.isDefault)?.id ?? writable[0]?.id;
	}

	async ensureCalendars(client: JMAPClient, options?: { force?: boolean }) {
		if (this.calendarsLoaded && !options?.force) return;

		this.calendarsLoading = true;
		this.error = null;

		try {
			if (!client.hasCalendars()) {
				this.supported = false;
				this.calendars = [];
				return;
			}

			this.supported = true;
			/* Session lists shared calendar accounts; refresh so a new share is visible. */
			await client.connect();
			const list = await client.getCalendars();
			this.calendars = list.map((item, index) => mapCalendar(item, index, item.accountId));
			this.hiddenCalendarIds = new Set(
				this.calendars.filter((item) => !item.isVisible).map(calendarKey)
			);
			this.calendarsLoaded = true;
			this.syncComposeCalendar();
		} catch (error) {
			this.error = errorMessage(error, 'Failed to load calendars');
			this.calendars = [];
		} finally {
			this.calendarsLoading = false;
		}
	}

	async reloadCalendars(client: JMAPClient) {
		await this.ensureCalendars(client, { force: true });
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
			this.events = events.map((event) => mapCalendarEvent(event, event.accountId));
		} catch (error) {
			this.events = [];
			this.error = errorMessage(error, 'Failed to load events');
		} finally {
			this.eventsLoading = false;
		}
	}

	visibleEvents = $derived.by(() => {
		if (!this.hiddenCalendarIds.size) return this.events;
		return this.events.filter((event) =>
			eventIsVisibleOnCalendars(event.calendarIds, this.hiddenCalendarIds, event.accountId)
		);
	});

	selectedEvent = $derived.by(() => {
		if (!this.selectedEventId) return null;
		return this.findEventByRef(this.selectedEventId, this.visibleEvents) ?? null;
	});

	calendarById(id: string, accountId?: string | null): Calendar | undefined {
		if (accountId) {
			const match = this.calendars.find(
				(item) => item.id === id && item.accountId === accountId
			);
			if (match) return match;
		}
		const byKey = this.calendars.find((item) => calendarKey(item) === id);
		if (byKey) return byKey;
		return this.calendars.find((item) => item.id === id);
	}

	eventsForDay(day: Date): CalendarEvent[] {
		const dayStart = new Date(day);
		dayStart.setHours(0, 0, 0, 0);
		const dayEnd = new Date(dayStart);
		dayEnd.setDate(dayEnd.getDate() + 1);
		const range = { start: dayStart, end: dayEnd };

		const expanded: CalendarEvent[] = [];
		for (const event of this.visibleEvents) {
			expanded.push(...expandRecurringEventInRange(event, range));
		}

		return expanded.sort((a, b) => a.start.getTime() - b.start.getTime());
	}

	isCalendarVisible(item: Calendar): boolean {
		return !this.hiddenCalendarIds.has(calendarKey(item));
	}

	toggleCalendar(target: Calendar, client?: JMAPClient | null) {
		const key = calendarKey(target);
		const next = new Set(this.hiddenCalendarIds);
		const visible = next.has(key);
		if (visible) next.delete(key);
		else next.add(key);
		this.hiddenCalendarIds = next;
		this.refreshCounter++;

		this.calendars = this.calendars.map((item) =>
			calendarKey(item) === key ? { ...item, isVisible: visible } : item
		);

		if (this.selectedEventId) {
			const selected = this.findEventByRef(this.selectedEventId, this.events);
			if (
				selected &&
				!eventIsVisibleOnCalendars(selected.calendarIds, next, selected.accountId)
			) {
				this.selectedEventId = null;
			}
		}

		if (client) {
			void this.persistVisibility(client, target.id, visible, target.accountId);
		}
	}

	private calendarAccountId(id: string): string | null {
		return this.calendarById(id)?.accountId ?? null;
	}

	private findEventByRef(ref: string, events: CalendarEvent[]): CalendarEvent | undefined {
		return (
			events.find((event) => eventKey(event) === ref) ??
			events.find((event) => event.id === ref)
		);
	}

	private eventAccountId(event: CalendarEvent): string | null {
		return (
			event.accountId ??
			event.calendarIds.map((id) => this.calendarById(id)?.accountId).find(Boolean) ??
			null
		);
	}

	private async persistVisibility(
		client: JMAPClient,
		id: string,
		isVisible: boolean,
		accountId?: string | null
	) {
		const key = calendarKey({ id, accountId: accountId ?? null });
		try {
			await client.updateCalendar(id, { isVisible, accountId: accountId ?? this.calendarAccountId(id) });
		} catch (error) {
			const reverted = new Set(this.hiddenCalendarIds);
			if (isVisible) reverted.add(key);
			else reverted.delete(key);
			this.hiddenCalendarIds = reverted;
			this.calendars = this.calendars.map((item) =>
				calendarKey(item) === key ? { ...item, isVisible: !isVisible } : item
			);
			this.refreshCounter++;
			toast.show(errorMessage(error, 'Could not update calendar visibility'), 'error');
		}
	}

	selectEvent(id: string | null) {
		if (!id) {
			this.selectedEventId = null;
			return;
		}

		if (this.composeOpen && this.composeMode === 'create') {
			this.closeCompose();
		}

		// Client-expanded recurrence instances use `${masterId}~${recurrenceId}`.
		const masterRef = id.includes('~') ? id.slice(0, id.indexOf('~')) : id;
		const match =
			this.findEventByRef(masterRef, this.visibleEvents) ??
			this.findEventByRef(masterRef, this.events);
		this.selectedEventId = match ? eventKey(match) : masterRef;
	}

	openCompose(day?: Date) {
		if (!this.defaultCalendarId()) {
			toast.show('Create a calendar you can edit before adding events.', 'error');
			return;
		}

		this.selectedEventId = null;
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
		if (!this.eventAllowsWrites(event)) {
			toast.show('You don’t have permission to change this event.', 'error');
			return;
		}

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
		const target = this.calendarById(this.composeDraft.calendarId);
		if (!target || !calendarAllowsWrites(target)) {
			return { ok: false, error: 'Choose a calendar you can edit' };
		}

		const { start, end } = this.composeRange();
		const allDay = this.composeDraft.allDay;
		if (allDay ? end.getTime() < start.getTime() : end.getTime() <= start.getTime()) {
			return { ok: false, error: allDay ? 'End date must be on or after start' : 'End must be after start' };
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
			location: this.composeDraft.location.trim() || undefined,
			recurrenceRule: recurrenceRuleFor(this.composeDraft.repeat)
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
		const match = this.findEventByRef(eventId, this.events);
		this.selectedEventId = match ? eventKey(match) : eventId;
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
					previousCalendarIds: this.composePreviousCalendarIds,
					accountId: this.calendarAccountId(payload.calendarId)
				});
				await this.afterSave(client, validated.title, validated.start, eventId, 'edit');
				return true;
			}

			const id = await client.createCalendarEvent({
				...payload,
				accountId: this.calendarAccountId(payload.calendarId)
			});
			await this.afterSave(client, validated.title, validated.start, id, 'create');
			return true;
		} catch (error) {
			const message = isSyntheticCalendarError(error)
				? "Recurring events can't be edited individually on this server yet."
				: error instanceof Error
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
		if (!this.eventAllowsWrites(event)) {
			toast.show('You don’t have permission to delete this event.', 'error');
			return false;
		}

		const { confirm: askConfirm } = await import('$lib/stores/confirm.svelte');
		if (
			!(await askConfirm.ask({
				title: 'Delete event?',
				description: `Delete "${event.title}"? This cannot be undone.`,
				confirmLabel: 'Delete',
				tone: 'danger'
			}))
		) {
			return false;
		}

		try {
			await client.destroyCalendarEvent(event.id, this.eventAccountId(event));
			if (this.selectedEventId === event.id || this.selectedEventId === eventKey(event)) {
				this.selectedEventId = null;
			}
			if (this.composeEventId === event.id) {
				this.closeCompose();
			}
			this.events = this.events.filter(
				(item) => item.id !== event.id || item.accountId !== event.accountId
			);
			this.refreshCounter++;
			toast.show(`"${event.title}" deleted`, 'success');
			return true;
		} catch (error) {
			const message = isSyntheticCalendarError(error)
				? "Recurring events can't be deleted individually on this server yet."
				: error instanceof Error
					? error.message
					: 'Failed to delete event';
			toast.show(message, 'error');
			return false;
		}
	}

	async deleteComposeEvent(client: JMAPClient): Promise<boolean> {
		if (!this.composeEventId) return false;
		const event = this.events.find((item) => item.id === this.composeEventId);
		if (!event) return false;
		return this.deleteEvent(client, event);
	}

	eventAllowsWrites(event: CalendarEvent): boolean {
		return event.calendarIds.some((id) => {
			const item = this.calendarById(id, event.accountId);
			return item ? calendarAllowsWrites(item) : false;
		});
	}

	private replaceCalendar(next: Calendar) {
		const index = this.calendars.findIndex(
			(item) => item.id === next.id && item.accountId === next.accountId
		);
		if (index < 0) {
			this.calendars = [...this.calendars, next];
			return;
		}
		const copy = [...this.calendars];
		copy[index] = next;
		this.calendars = copy;
	}

	private syncComposeCalendar() {
		const writableIds = new Set(this.writableCalendars.map((item) => item.id));
		if (this.composeDraft.calendarId && writableIds.has(this.composeDraft.calendarId)) return;
		this.composeDraft.calendarId = this.defaultCalendarId() ?? '';
	}

	private async hydrateCalendar(
		client: JMAPClient,
		id: string,
		accountId?: string | null
	): Promise<Calendar | undefined> {
		const [raw] = await client.getCalendarsByIds([id], accountId);
		if (!raw) return undefined;
		const mapped = mapCalendar(raw, this.calendars.length, accountId ?? raw.accountId);
		this.replaceCalendar(mapped);
		return mapped;
	}

	async createCalendar(
		client: JMAPClient,
		input: { name: string; color?: string }
	): Promise<Calendar> {
		const trimmed = input.name.trim();
		if (!trimmed) throw new Error('Calendar name cannot be empty');

		const color = input.color || nextCalendarColor(this.calendars.map((item) => item.color));
		const id = await client.createCalendar({ name: trimmed, color });
		let created: Calendar | undefined;
		const ownAccountId = client.getCalendarAccountId();
		try {
			created = await this.hydrateCalendar(client, id, ownAccountId);
		} catch {
			created = undefined;
		}
		created ??= mapCalendar(
			{ id, name: trimmed, color, isVisible: true, isDefault: false, isSubscribed: true },
			this.calendars.length,
			ownAccountId
		);
		if (!this.calendarById(created.id)) this.replaceCalendar(created);

		this.refreshCounter++;
		toast.show(`Created “${created.name}”`, 'success');
		return created;
	}

	async updateCalendarDetails(
		client: JMAPClient,
		id: string,
		patch: { name?: string; color?: string }
	): Promise<void> {
		const existing = this.calendarById(id);
		if (!existing) throw new Error('Calendar not found');

		const name = patch.name?.trim();
		if (name !== undefined && !name) throw new Error('Calendar name cannot be empty');

		const nextName = name ?? existing.name;
		const nextColor = patch.color ?? existing.color;
		if (nextName === existing.name && nextColor === existing.color) return;

		this.replaceCalendar({ ...existing, name: nextName, color: nextColor });
		this.refreshCounter++;

		try {
			await client.updateCalendar(existing.id, {
				...(name !== undefined ? { name } : {}),
				...(patch.color !== undefined ? { color: patch.color } : {}),
				accountId: existing.accountId
			});
			toast.show(`Updated “${nextName}”`, 'success');
		} catch (error) {
			this.replaceCalendar(existing);
			this.refreshCounter++;
			throw error;
		}
	}

	async setDefaultCalendar(client: JMAPClient, id: string): Promise<void> {
		const existing = this.calendarById(id);
		if (!existing) throw new Error('Calendar not found');
		if (existing.isDefault) return;

		const previous = this.calendars;
		this.calendars = this.calendars.map((item) => ({
			...item,
			isDefault: calendarKey(item) === calendarKey(existing)
		}));

		try {
			await client.setDefaultCalendar(existing.id);
			toast.show(`“${existing.name}” is now the default calendar`, 'success');
		} catch (error) {
			this.calendars = previous;
			throw error;
		}
	}

	async deleteCalendar(client: JMAPClient, id: string): Promise<boolean> {
		const existing = this.calendarById(id);
		if (!existing) throw new Error('Calendar not found');

		const blocked = calendarDeleteBlockedReason(existing, this.calendars);
		if (blocked) throw new Error(blocked);

		const { confirm: askConfirm } = await import('$lib/stores/confirm.svelte');
		if (
			!(await askConfirm.ask({
				title: 'Delete calendar?',
				description: `Delete “${existing.name}”? Events that live only in this calendar will be removed.`,
				confirmLabel: 'Delete',
				tone: 'danger'
			}))
		) {
			return false;
		}

		try {
			await client.destroyCalendar(existing.id, false, existing.accountId);
		} catch (error) {
			if (!isJmapMethodError(error, 'calendarHasEvent')) throw error;
			if (
				!(await askConfirm.ask({
					title: 'Delete events too?',
					description: `“${existing.name}” still has events. Delete the calendar and those events? This cannot be undone.`,
					confirmLabel: 'Delete calendar and events',
					tone: 'danger'
				}))
			) {
				return false;
			}
			await client.destroyCalendar(existing.id, true, existing.accountId);
		}

		this.calendars = this.calendars.filter((item) => calendarKey(item) !== calendarKey(existing));
		this.events = this.events.filter((event) => {
			if (!event.calendarIds.includes(existing.id)) return true;
			if (existing.accountId && event.accountId && event.accountId !== existing.accountId) {
				return true;
			}
			return false;
		});
		const hidden = new Set(this.hiddenCalendarIds);
		hidden.delete(calendarKey(existing));
		this.hiddenCalendarIds = hidden;

		if (this.selectedEvent?.calendarIds.includes(existing.id)) {
			this.selectedEventId = null;
		}
		if (this.composeDraft.calendarId === existing.id) {
			this.composeDraft.calendarId = this.defaultCalendarId() ?? '';
		}

		this.refreshCounter++;
		toast.show(`Deleted “${existing.name}”`, 'success');
		return true;
	}

	async shareCalendar(
		client: JMAPClient,
		calendarId: string,
		principalId: string,
		role: CalendarShareRole
	): Promise<void> {
		const existing = this.calendarById(calendarId);
		if (!existing) throw new Error('Calendar not found');

		const selfId = client.getCurrentUserPrincipalId();
		if (selfId && principalId === selfId) {
			throw new Error('You already own this calendar.');
		}

		const rights = rightsForShareRole(role);
		await this.applyShareWith(client, existing, principalId, rights);
	}

	async unshareCalendar(client: JMAPClient, calendarId: string, principalId: string): Promise<void> {
		const existing = this.calendarById(calendarId);
		if (!existing) throw new Error('Calendar not found');
		await this.applyShareWith(client, existing, principalId, null);
	}

	private async applyShareWith(
		client: JMAPClient,
		existing: Calendar,
		principalId: string,
		rights: CalendarRights | null
	): Promise<void> {
		const previous = existing.shareWith;
		const patched = patchShareWith(previous, principalId, rights);
		const nextShareWith = Object.fromEntries(
			Object.entries(patched).filter((entry): entry is [string, CalendarRights] => entry[1] !== null)
		);

		this.replaceCalendar({
			...existing,
			shareWith: Object.keys(nextShareWith).length ? nextShareWith : null
		});

		try {
			await client.updateCalendar(existing.id, {
				shareWith: patched,
				accountId: existing.accountId
			});
		} catch (error) {
			this.replaceCalendar({ ...existing, shareWith: previous });
			throw error;
		}

		try {
			const hydrated = await this.hydrateCalendar(client, existing.id, existing.accountId);
			if (hydrated && !hydrated.shareWith && Object.keys(nextShareWith).length) {
				this.replaceCalendar({ ...hydrated, shareWith: nextShareWith });
			}
		} catch {
			// Set succeeded; keep the optimistic share list if GET omits shareWith.
		}
		this.refreshCounter++;
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
