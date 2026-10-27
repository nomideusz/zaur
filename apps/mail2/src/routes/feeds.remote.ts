/**
 * Subscribed calendars: the server fetches the feed (see `#lib/server/feeds`)
 * and the browser reads it with svelte-calendar's `parseIcs`, recurrences and
 * all, as it does a holiday list.
 */
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { query } from '$app/server';
import { requireSession } from '#lib/server/account';
import { DEMO_JMAP_URL } from '#lib/server/demo';
import { FeedError, cachedFeed } from '#lib/server/feeds';

export const calendarFeed = query(v.pipe(v.string(), v.minLength(1), v.maxLength(2000)), async (url): Promise<string> => {
	requireSession();
	// Anyone has a session on the public demo: a fetch of any URL there is an open proxy.
	if (DEMO_JMAP_URL) error(403, 'Subscriptions are switched off in the demo.');
	try {
		return await cachedFeed(url);
	} catch (cause) {
		if (cause instanceof FeedError) error(400, cause.message);
		throw cause;
	}
});
