/**
 * Subscribed calendars, drawn and toggled like JMAP ones but read-only: a
 * Google, iCloud or Outlook link kept in the account's prefs, its text
 * fetched by `feeds.remote.ts` and read here with svelte-calendar's
 * `parseIcs`, which expands the repeats per range.
 */
import { parseIcs, type IcsCalendar } from '@nomideusz/svelte-calendar';
import type { Calendar, CalendarEvent } from '@zaur/mail-core';
import type { CalendarFeed } from '#lib/settings';

/** No JMAP account is called this; it keys the subscriptions apart from every real calendar. */
export const FEEDS_ACCOUNT = 'zaur:feeds';

export const isFeed = (calendar: Pick<Calendar, 'accountId'>) => calendar.accountId === FEEDS_ACCOUNT;

export function feedCalendar(feed: CalendarFeed): Calendar {
	return {
		id: feed.id,
		name: feed.name,
		color: feed.color,
		isDefault: false,
		isVisible: feed.visible,
		isSubscribed: true,
		myRights: {
			mayReadFreeBusy: true,
			mayReadItems: true,
			mayWriteAll: false,
			mayWriteOwn: false,
			mayUpdatePrivate: false,
			mayRSVP: false,
			mayShare: false,
			mayDelete: false
		},
		shareWith: null,
		accountId: FEEDS_ACCOUNT
	};
}

// ponytail: one parse per feed text, per page load; the text's own query is the cache.
const parsedTexts = new Map<string, IcsCalendar>();
export function parsed(text: string): IcsCalendar {
	let calendar = parsedTexts.get(text);
	if (!calendar) {
		if (parsedTexts.size > 40) parsedTexts.clear();
		calendar = parseIcs(text);
		parsedTexts.set(text, calendar);
	}
	return calendar;
}

/** A feed's occurrences overlapping start–end, as the page's events. */
export function feedEvents(feed: CalendarFeed, text: string, start: Date, end: Date): CalendarEvent[] {
	return parsed(text)
		.events({ start, end })
		.filter((event) => event.status !== 'cancelled')
		.map((event) => {
			const description = event.data?.description;
			return {
				id: `${feed.id}:${event.id}`,
				accountId: FEEDS_ACCOUNT,
				calendarIds: [feed.id],
				title: event.title || '(No title)',
				description: typeof description === 'string' ? description : undefined,
				location: event.location,
				start: event.start,
				end: event.end,
				allDay: Boolean(event.allDay)
			};
		});
}

/** A short random id for a new subscription. */
export const newFeedId = () => `f${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
