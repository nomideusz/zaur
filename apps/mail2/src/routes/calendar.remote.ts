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
	isJmapMethodError,
	mapCalendar,
	mapCalendarEvent,
	recurrenceRuleFrom,
	rightsForShareRole,
	type Calendar,
	type CalendarEvent,
	type EventRecurrence,
	type JMAPPrincipal
} from '@zaur/mail-core';
import { connect } from '#lib/server/account';
import { pickPrincipal } from '#lib/share';

const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const ISO_DURATION = /^P(?!$)(\d+D)?(T(?=\d)(\d+H)?(\d+M)?)?$/;
const TIME_ZONE = v.pipe(v.string(), v.minLength(1), v.maxLength(64), v.regex(/^[A-Za-z0-9_+\-/]+$/));
const ID = v.pipe(v.string(), v.minLength(1), v.maxLength(200));
const ACCOUNT = v.optional(v.nullable(v.pipe(v.string(), v.maxLength(200))));
const COLOR = v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/));
const ROLE = v.picklist(['read', 'write']);

export interface CalendarsState {
	supported: boolean;
	calendars: Calendar[];
	/** Your own calendar account. Anything else in the list was shared with you. */
	primaryAccountId: string | null;
	/** The server has a directory of people (JMAP Principals) to share with. */
	canShare: boolean;
}

function rethrow(cause: unknown): never {
	if (cause instanceof JmapMethodError) error(400, cause.message);
	if (cause instanceof Error && /not supported|Calendars not/i.test(cause.message)) error(501, cause.message);
	throw cause;
}

export const calendars = query(async (): Promise<CalendarsState> => {
	const client = await connect();
	if (!client.hasCalendars()) return { supported: false, calendars: [], primaryAccountId: null, canShare: false };
	const list = await client.getCalendars();
	return {
		supported: true,
		calendars: list.map((calendar, index) => mapCalendar(calendar, index, calendar.accountId)),
		primaryAccountId: client.getCalendarAccountId() || null,
		canShare: client.hasPrincipals()
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
	/** `null` does not repeat. `count` and `until` are exclusive; count wins. */
	recurrence: v.nullable(
		v.object({
			frequency: v.picklist(['daily', 'weekly', 'monthly', 'yearly']),
			interval: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(999)),
			byDay: v.pipe(v.array(v.picklist(['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'])), v.maxLength(7)),
			until: v.optional(v.pipe(v.string(), v.regex(LOCAL_DATETIME))),
			count: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(999)))
		})
	)
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
			recurrenceRule: recurrenceRuleFrom(input.recurrence as EventRecurrence | null)
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
		/**
		 * One occurrence of a series leaves the rule alone: Stalwart records the
		 * edit as an override, and writing a rule onto an override would rewrite
		 * the series from one of its own instances.
		 */
		keepRecurrence: v.optional(v.boolean()),
		/**
		 * `id` is a synthetic occurrence id, so the patch is an override and
		 * carries only what one occurrence owns. It implies `keepRecurrence`;
		 * a drag sets that on its own, for a master event too, because moving
		 * an event never edits the rule behind it.
		 */
		occurrence: v.optional(v.boolean()),
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
				previousCalendarIds: input.previousCalendarIds,
				occurrence: input.occurrence,
				// `undefined` leaves it alone; `null` clears it; a rule sets it.
				// Until now nothing was sent at all, so a changed rule was dropped.
				recurrenceRule:
					input.keepRecurrence || input.occurrence
						? undefined
						: (recurrenceRuleFrom(input.recurrence as EventRecurrence | null) ?? null)
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
		color: v.optional(COLOR)
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

export const updateCalendar = command(
	v.object({
		id: ID,
		accountId: ACCOUNT,
		name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Give the calendar a name'), v.maxLength(200)),
		color: COLOR
	}),
	async ({ id, accountId, name, color }): Promise<{ ok: true }> => {
		const client = await connect();
		try {
			await client.updateCalendar(id, { name, color, accountId: accountId ?? null });
			void calendars().refresh();
			return { ok: true };
		} catch (cause) {
			rethrow(cause);
		}
	}
);

/** Where a new event lands. Only your own account has one: the flag is per account. */
export const makeDefaultCalendar = command(v.object({ id: ID }), async ({ id }): Promise<{ ok: true }> => {
	const client = await connect();
	try {
		await client.setDefaultCalendar(id);
		void calendars().refresh();
		return { ok: true };
	} catch (cause) {
		rethrow(cause);
	}
});

/**
 * The server refuses a calendar that still holds events unless told to take
 * them too, so the first try asks for the calendar alone and says whether
 * there was anything in it; only a second, confirmed try removes the events.
 */
export const deleteCalendar = command(
	v.object({ id: ID, accountId: ACCOUNT, removeEvents: v.boolean() }),
	async ({ id, accountId, removeEvents }): Promise<{ deleted: boolean }> => {
		const client = await connect();
		try {
			await client.destroyCalendar(id, removeEvents, accountId ?? null);
		} catch (cause) {
			if (isJmapMethodError(cause, 'calendarHasEvent')) return { deleted: false };
			rethrow(cause);
		}
		void calendars().refresh();
		return { deleted: true };
	}
);

/** Names for the people a calendar is shared with; the calendar itself only has their ids. */
export const sharePeople = query(
	v.pipe(v.array(ID), v.maxLength(200)),
	async (ids): Promise<JMAPPrincipal[]> => {
		const client = await connect();
		// A server that will not say who someone is still shares with them: ids it is.
		return client.getPrincipals(ids).catch(() => []);
	}
);

/** Share by address. The address is looked up in the server's directory — see `pickPrincipal`. */
export const shareCalendar = command(
	v.object({
		id: ID,
		accountId: ACCOUNT,
		email: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(320)),
		role: ROLE
	}),
	async ({ id, accountId, email, role }): Promise<{ person: JMAPPrincipal }> => {
		const client = await connect();
		try {
			const pick = pickPrincipal(await client.queryPrincipals(email), email, client.getCurrentUserPrincipalId());
			if ('error' in pick) error(400, pick.error);
			await client.updateCalendar(id, {
				shareWith: { [pick.person.id]: rightsForShareRole(role) },
				accountId: accountId ?? null
			});
			void calendars().refresh();
			return { person: pick.person };
		} catch (cause) {
			if (isJmapMethodError(cause, 'forbidden'))
				error(400, 'This server does not let you look people up. Ask its admin to allow directory queries.');
			rethrow(cause);
		}
	}
);

/** Change what one person may do with a calendar, or (`role: null`) take it away from them. */
export const setCalendarShare = command(
	v.object({ id: ID, accountId: ACCOUNT, principalId: ID, role: v.nullable(ROLE) }),
	async ({ id, accountId, principalId, role }): Promise<{ ok: true }> => {
		const client = await connect();
		try {
			await client.updateCalendar(id, {
				shareWith: { [principalId]: role ? rightsForShareRole(role) : null },
				accountId: accountId ?? null
			});
			void calendars().refresh();
			return { ok: true };
		} catch (cause) {
			rethrow(cause);
		}
	}
);
