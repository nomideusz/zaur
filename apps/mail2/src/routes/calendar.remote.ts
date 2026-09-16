/**
 * Calendar over JMAP Calendars, on the client mail-core already carried for
 * webmail 1.0. Two things are different here:
 *
 * - Recurring events are expanded **by the server** (`expandRecurrences`,
 *   which Stalwart implements now), so a weekly meeting is a row per week
 *   with a synthetic id, and editing one asks whether it is this occurrence
 *   or the series. 1.0 expanded client-side against a local copy.
 * - Dates cross the wire as `Date` (devalue handles them); the browser owns
 *   the time zone and sends it with every query, because the server's clock
 *   is not the person's.
 */
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import {
	JmapMethodError,
	mapCalendar,
	mapCalendarEvent,
	recurrenceRuleFor,
	type Calendar,
	type CalendarEvent,
	type EventRepeat
} from '@zaur/mail-core';
import { connect } from '#lib/server/account';

const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const ISO_DURATION = /^P(?!$)(\d+D)?(T(?=\d)(\d+H)?(\d+M)?)?$/;
const TIME_ZONE = v.pipe(v.string(), v.minLength(1), v.maxLength(64), v.regex(/^[A-Za-z0-9_+\-/]+$/));
const ID = v.pipe(v.string(), v.minLength(1), v.maxLength(200));

export interface CalendarsState {
	supported: boolean;
	calendars: Calendar[];
}

function rethrow(cause: unknown): never {
	if (cause instanceof JmapMethodError) error(400, cause.message);
	if (cause instanceof Error && /not supported|Calendars not/i.test(cause.message)) error(501, cause.message);
	throw cause;
}

export const calendars = query(async (): Promise<CalendarsState> => {
	const client = await connect();
	if (!client.hasCalendars()) return { supported: false, calendars: [] };
	const list = await client.getCalendars();
	return {
		supported: true,
		calendars: list.map((calendar, index) => mapCalendar(calendar, index, calendar.accountId))
	};
});

/**
 * Events in a window, expanded. `after`/`before` are local date-times in
 * `timeZone` (JMAP's wire form for query bounds); a month view asks for its
 * six-week grid so the edges are filled too.
 */
export const events = query(
	v.object({
		after: v.pipe(v.string(), v.regex(LOCAL_DATETIME)),
		before: v.pipe(v.string(), v.regex(LOCAL_DATETIME)),
		timeZone: TIME_ZONE
	}),
	async ({ after, before, timeZone }): Promise<CalendarEvent[]> => {
		const client = await connect();
		if (!client.hasCalendars()) return [];
		try {
			const { events: list } = await client.queryCalendarEvents({
				after,
				before,
				timeZone,
				expandRecurrences: true
			});
			return list
				.map((event) => mapCalendarEvent(event, event.accountId))
				.sort((a, b) => a.start.getTime() - b.start.getTime() || a.title.localeCompare(b.title));
		} catch (cause) {
			rethrow(cause);
		}
	}
);

const eventInput = v.object({
	calendarId: ID,
	accountId: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(200)))),
	title: v.pipe(v.string(), v.trim(), v.minLength(1, 'Give the event a title'), v.maxLength(500)),
	/** Local date-time without offset, interpreted in `timeZone`. */
	start: v.pipe(v.string(), v.regex(LOCAL_DATETIME)),
	duration: v.pipe(v.string(), v.regex(ISO_DURATION)),
	timeZone: TIME_ZONE,
	allDay: v.boolean(),
	description: v.pipe(v.string(), v.maxLength(10_000)),
	location: v.pipe(v.string(), v.maxLength(500)),
	repeat: v.picklist(['none', 'daily', 'weekly', 'monthly', 'yearly'])
});

export const createEvent = command(eventInput, async (input): Promise<{ id: string }> => {
	const client = await connect();
	try {
		const id = await client.createCalendarEvent({
			calendarId: input.calendarId,
			accountId: input.accountId ?? null,
			title: input.title,
			start: input.start,
			duration: input.duration,
			timeZone: input.timeZone,
			showWithoutTime: input.allDay,
			description: input.description.trim() || undefined,
			location: input.location.trim() || undefined,
			recurrenceRule: recurrenceRuleFor(input.repeat as EventRepeat)
		});
		return { id };
	} catch (cause) {
		rethrow(cause);
	}
});

/**
 * Update an event — the master when `id` is a real id, one occurrence when it
 * is a synthetic instance id (Stalwart records a recurrence override).
 * `previousCalendarIds` lets a move between calendars unfile from the old one.
 */
export const updateEvent = command(
	v.object({
		id: ID,
		previousCalendarIds: v.pipe(v.array(ID), v.maxLength(20)),
		...eventInput.entries
	}),
	async (input): Promise<{ ok: true }> => {
		const client = await connect();
		try {
			await client.updateCalendarEvent(input.id, {
				calendarId: input.calendarId,
				accountId: input.accountId ?? null,
				title: input.title,
				start: input.start,
				duration: input.duration,
				timeZone: input.timeZone,
				showWithoutTime: input.allDay,
				description: input.description.trim() || undefined,
				location: input.location.trim() || undefined,
				previousCalendarIds: input.previousCalendarIds
			});
			return { ok: true };
		} catch (cause) {
			rethrow(cause);
		}
	}
);

export const deleteEvent = command(
	v.object({ id: ID, accountId: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(200)))) }),
	async ({ id, accountId }): Promise<{ ok: true }> => {
		const client = await connect();
		try {
			await client.destroyCalendarEvent(id, accountId ?? null);
			return { ok: true };
		} catch (cause) {
			rethrow(cause);
		}
	}
);

export const setCalendarVisible = command(
	v.object({
		id: ID,
		accountId: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(200)))),
		visible: v.boolean()
	}),
	async ({ id, accountId, visible }): Promise<{ ok: true }> => {
		const client = await connect();
		try {
			await client.updateCalendar(id, { isVisible: visible, accountId: accountId ?? null });
			void calendars().refresh();
			return { ok: true };
		} catch (cause) {
			rethrow(cause);
		}
	}
);

export const createCalendar = command(
	v.object({
		name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
		color: v.optional(v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/)))
	}),
	async ({ name, color }): Promise<{ id: string }> => {
		const client = await connect();
		try {
			const id = await client.createCalendar({ name, color });
			void calendars().refresh();
			return { id };
		} catch (cause) {
			rethrow(cause);
		}
	}
);
