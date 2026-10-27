<script lang="ts">
	import { ask } from '#lib/confirm.svelte.ts';
	import { tick, untrack, type ComponentProps } from 'svelte';
	import { messageOf } from '#lib/errors';
	import { leaveGuard } from '#lib/leave-guard';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Calendar as CalendarGrid } from '@nomideusz/svelte-calendar';
	import type { CalendarViewId, TimelineEvent } from '@nomideusz/svelte-calendar';
	import type { Calendar, CalendarEvent } from '@zaur/mail-core';
	import { calendarAllowsWrites, calendarKey, isRecurringInstance } from '@zaur/mail-core';
	import {
		addDays,
		durationBetween,
		formatJmapQueryBound,
		formatWeekRange,
		toDateInputValue,
		weekDays
	} from '@zaur/mail-core/utils/dates';
	import SectionShell from '#lib/components/mail/SectionShell.svelte';
	import EventEditor, { type EventDraft } from '#lib/components/calendar/EventEditor.svelte';
	import CalendarList from '#lib/components/calendar/CalendarList.svelte';
	import CalendarSettings from '#lib/components/calendar/CalendarSettings.svelte';
	import EventView from '#lib/components/calendar/EventView.svelte';
	import { startOfDay } from '#lib/calendar/schedule';
	import { ZAUR_THEME, sourceOf, toTimelineEvent } from '#lib/calendar/bridge';
	import { getShell } from '#lib/shell.svelte.ts';
	import { backLayer } from '#lib/back-layer.svelte.ts';
	import { viewport } from '#lib/viewport.svelte.ts';
	import { whoami } from '../../session.remote';
	import {
		calendars as calendarsRemote,
		events as eventsRemote,
		createEvent,
		updateEvent,
		deleteEvent,
		setCalendarVisible,
		createCalendar
	} from '../../calendar.remote';
	import { holidays as holidaysRemote } from '../../holidays.remote';
	import { prefs, setPref } from '#lib/settings.svelte.ts';
	import {
		holidayCountry,
		holidayEvents,
		holidaysCalendar,
		isHolidays,
		yearsIn
	} from '#lib/calendar/holidays';
	import HolidaySettings from '#lib/components/calendar/HolidaySettings.svelte';
	import CalendarImport from '#lib/components/calendar/CalendarImport.svelte';
	import FeedSettings from '#lib/components/calendar/FeedSettings.svelte';
	import { feedCalendar, feedEvents, isFeed } from '#lib/calendar/feeds';
	import { calendarFeed } from '../../feeds.remote';
	import CalendarStatusLine from '#lib/components/calendar/CalendarStatusLine.svelte';
	import QuickAddLine, { type Reading } from '#lib/components/calendar/QuickAdd.svelte';
	import EventSearch from '#lib/components/calendar/EventSearch.svelte';
	import { dayGaps, dayVoice, span as spanOf } from '#lib/calendar/day-shape';

	const who = whoami();
	const session = $derived(who.current ?? null);

	$effect(() => {
		if (who.ready && !who.current) goto('/login', { replaceState: true });
	});

	/* ── Where we are looking ─────────────────────────────────────────── */

	/**
	 * The grid owns direct manipulation — drag to move, drag an edge to resize,
	 * sweep empty canvas to create — and we keep the chrome: the shell's own
	 * tactile view switcher and date nav drive it through `view` and
	 * `currentDate`, so the header is ours and the geometry is the package's.
	 *
	 * Two views: a day's time grid, and the week as weeks stacked in one endless
	 * scroll (each chip at the height of its start time), where the past is up
	 * and the next month is a flick away. On a phone the package swaps each for
	 * its touch view: the day with swipes, the week as a list of its days.
	 */
	type View = 'day' | 'week';
	const VIEWS: { value: View; label: string; short: string; id: CalendarViewId }[] = [
		{ value: 'day', label: 'Day', short: 'D', id: 'day-planner' },
		{ value: 'week', label: 'Week', short: 'W', id: 'week-scroll' }
	];

	const today = startOfDay(new Date());
	let anchor = $state(today);
	let view = $state<View>('week');
	const viewId = $derived(VIEWS.find((option) => option.value === view)!.id);
	// The week scroll moves the grid's own focus to its centre week's Monday. A
	// fresh Date per view switch makes the grid take the anchor again, so the
	// day opens on the day we kept, not the Monday the scroll drifted to.
	const gridDate = $derived(view && new Date(anchor));

	let phone = $state(false);
	$effect(() => {
		const narrow = window.matchMedia('(max-width: 639px)');
		const sync = () => (phone = narrow.matches);
		sync();
		// The day reads best on a phone. Only on the way in — after that the
		// switcher is the person's, whatever size the screen is.
		if (narrow.matches) view = 'day';
		narrow.addEventListener('change', sync);
		return () => narrow.removeEventListener('change', sync);
	});

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
	/** The grid's clock and dates in the person's own language, not the package's en-US "10:00a". */
	const locale = typeof navigator === 'undefined' ? undefined : navigator.language;
	/** The days the header names: the day, or the week the scroll is on. */
	const span = $derived(view === 'day' ? [anchor] : weekDays(anchor, 'monday'));

	function step(delta: number) {
		anchor = addDays(anchor, view === 'day' ? delta : 7 * delta);
	}

	// Under 1024px the header has no room for "Saturday, September 19", nor
	// for the year after a week that is plainly this one.
	const short = (date: Date) => date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	const title = $derived(
		view === 'day'
			? anchor.toLocaleDateString(
					undefined,
					viewport.compact
						? { weekday: 'short', day: 'numeric', month: 'short' }
						: { weekday: 'long', day: 'numeric', month: 'long' }
				)
			: viewport.compact
				? `${short(span[0]!)} – ${short(span[span.length - 1]!)}`
				: formatWeekRange(anchor, 'monday')
	);

	/* ── Data ─────────────────────────────────────────────────────────── */

	const calendarsResource = $derived(session ? calendarsRemote() : undefined);
	const calendarsState = $derived(calendarsResource?.current ?? null);
	/** Whose public holidays: chosen in their settings, else the browser's language's country. */
	const detectedCountry = holidayCountry('', typeof navigator === 'undefined' ? undefined : navigator.language);
	const country = $derived(prefs.holidayCountry === 'none' ? null : prefs.holidayCountry || detectedCountry);
	const holidaysCal = $derived(
		calendarsState?.supported && country ? holidaysCalendar(country, prefs.showHolidays) : null
	);
	const feedCals = $derived(calendarsState?.supported ? prefs.calendarFeeds.map(feedCalendar) : []);
	const calendarList = $derived([...(calendarsState?.calendars ?? []), ...feedCals, ...(holidaysCal ? [holidaysCal] : [])]);
	/** A range's holidays, each year asked for once and cached by the query. */
	async function holidaysIn(start: Date, end: Date): Promise<CalendarEvent[]> {
		if (!country || !holidaysCal?.isVisible) return [];
		const code = country;
		const years = await Promise.all(
			yearsIn(start, end).map((year) => holidaysRemote({ country: code, year }).catch(() => []))
		);
		return years.flatMap((list) => holidayEvents(code, list, start, end));
	}
	/** The subscribed calendars' events in a range; one that does not answer just stays empty. */
	async function feedsIn(start: Date, end: Date): Promise<CalendarEvent[]> {
		if (!calendarsState?.supported) return [];
		const lists = await Promise.all(
			prefs.calendarFeeds
				.filter((feed) => feed.visible)
				.map((feed) =>
					calendarFeed(feed.url)
						.then((text) => feedEvents(feed, text, start, end))
						.catch(() => [])
				)
		);
		return lists.flat();
	}

	// Push: a change made on the phone shows up here.
	const shell = getShell()!;
	$effect(() =>
		shell.onLive(({ calendar }) => {
			if (calendar) {
				void calendarsResource?.refresh();
				void reload();
			}
		})
	);

	/**
	 * JMAP calendar ids are only unique within an account, and a shared calendar
	 * lives in the sharer's. Your own calendar and one shared with you are both
	 * `b` — keyed by the bare id, one silently replaces the other, and an event
	 * filed "here" lands in somebody else's mailbox.
	 */
	const calendarByKey = $derived(new Map(calendarList.map((calendar) => [calendarKey(calendar), calendar])));
	const calendarsOf = (event: CalendarEvent) =>
		event.calendarIds.map((id) => calendarByKey.get(calendarKey({ id, accountId: event.accountId })));
	/**
	 * A load that fails must not look like an empty calendar. What each range
	 * last answered is kept, so a refresh that fails (offline, the server away)
	 * shows that again and says so; with nothing kept, the failure stands where
	 * the events would.
	 */
	// ponytail: one entry per range looked at while the page is open; trim it if that ever adds up.
	const kept = new Map<string, CalendarEvent[]>();
	const rangeKey = (bounds: { after: string; before: string }) => `${bounds.after}|${bounds.before}`;
	/** The grid's last load failed: it shows what was `kept`, or had nothing to show. */
	let failed = $state<'kept' | 'nothing' | null>(null);

	function colorOf(event: CalendarEvent): string {
		return calendarsOf(event)[0]?.color ?? 'var(--z-accent)';
	}

	/** Whether any calendar it is filed in takes writes — the grid cannot tell per event. */
	function mayChange(event: CalendarEvent): boolean {
		return calendarsOf(event).some((calendar) => calendar !== undefined && calendarAllowsWrites(calendar));
	}

	/**
	 * The grid asks for the range it is actually drawing, which is the only
	 * honest contract: the day planner wants a day, the week scroll the ±8
	 * weeks it buffers (more as it is scrolled). Remote queries are cached per
	 * range, so coming back to one is answered at once.
	 *
	 * Rebuilt whenever the calendars' visibility changes or a write lands —
	 * the grid reloads on a new adapter, and that is the only handle it gives.
	 */
	let gridHeight = $state(0);
	let dataVersion = $state(0);
	/**
	 * The bounds the grid last asked for: a remote query caches per argument,
	 * and after a write this is the one to ask again.
	 * Plain, not `$state`: the adapter writes it from inside the grid's own
	 * load effect, and a signal there would feed back into that effect.
	 */
	let gridRange: { after: string; before: string; timeZone: string } | null = null;
	const adapter = $derived.by(() => {
		const by = calendarByKey;
		const shown = ghost;
		const daily = view === 'day';
		dataVersion;
		return {
			async fetchEvents(range: { start: Date; end: Date }) {
				const bounds = {
					after: formatJmapQueryBound(range.start),
					before: formatJmapQueryBound(range.end),
					timeZone
				};
				gridRange = bounds;
				let list: CalendarEvent[];
				try {
					const query = eventsRemote(bounds);
					// A failure is cached like an answer: come back to, the range would
					// fail again without being asked for. (Untracked: see `gridRange`.)
					if (untrack(() => query.error)) await query.refresh();
					list = await query;
					kept.set(rangeKey(bounds), list);
					// Only the range asked for last says how the grid's load went. The
					// grid asks for two on the way in, and the first, answered a moment
					// later from what was kept, cleared the failure of the one it draws.
					if (gridRange === bounds) failed = null;
				} catch {
					// The grid draws a failed load as an empty week; see `kept`.
					const before = kept.get(rangeKey(bounds));
					if (gridRange === bounds) failed = before ? 'kept' : 'nothing';
					list = before ?? [];
				}
				const [holidayList, feedList] = await Promise.all([holidaysIn(range.start, range.end), feedsIn(range.start, range.end)]);
				list = [...list, ...holidayList, ...feedList].filter((event) =>
					event.calendarIds.some((id) => by.get(calendarKey({ id, accountId: event.accountId }))?.isVisible !== false)
				);
				const rows = list.map((event) => toTimelineEvent(event, colorOf(event)));
				// The day draws its free time too: the stretches between events, there to be taken.
				if (daily)
					for (let day = startOfDay(range.start); day < range.end; day = addDays(day, 1))
						for (const gap of dayGaps(list, day))
							rows.push({ id: `gap:${+gap.start}`, title: `${spanOf(gap.minutes)} free`, start: gap.start, end: gap.end, color: 'transparent', data: { readOnly: true, gap: true } });
				if (shown && shown.end > range.start && shown.start < range.end) rows.push(shown);
				return rows;
			}
		};
	});

	/** Put the server's answer back in front of the grid. */
	async function reload() {
		// Settled: a refresh that fails still has to reach the grid, which says so.
		if (gridRange) await Promise.allSettled([eventsRemote(gridRange).refresh(), ahead?.refresh()]);
		dataVersion++;
	}

	/* ── Editing ──────────────────────────────────────────────────────── */

	/**
	 * What the rail holds: nothing (`view`, the rail is shut), an event as it is,
	 * the editor, and — the grid's calendars are a sidebar only on a wide screen —
	 * the calendar list and one calendar's settings.
	 */
	let mode = $state<'view' | 'event' | 'new' | 'edit' | 'calendars' | 'calendar' | 'import' | 'search'>('view');
	let editing = $state<CalendarEvent | null>(null);
	/** What a new event opens on — a day, or the exact slot that was drawn. */
	let draftAt = $state(today);
	let draftEnd = $state<Date | null>(null);
	let saving = $state(false);
	let editorError = $state<string | null>(null);
	let notice = $state<string | null>(null);

	function flash(text: string) {
		notice = text;
		// Only its own: a second notice inside the window keeps its full time.
		setTimeout(() => {
			if (notice === text) notice = null;
		}, 2500);
	}

	/**
	 * On a phone the rail's panel covers the whole screen, so it is a history
	 * entry: Back closes it rather than leaving the calendar.
	 */
	const panel = backLayer('calendar-panel');

	/** An event form with something typed in it asks before it is dropped; so does a calendar's name. */
	let editor = $state<ReturnType<typeof EventEditor> | null>(null);
	let settings = $state<{ isDirty(): boolean } | null>(null);
	const mayLeave = leaveGuard(
		() =>
			mode === 'calendar'
				? (settings?.isDirty() ?? false)
				: (mode === 'new' || mode === 'edit') && (editor?.isDirty() ?? false),
		() => (mode === 'calendar' ? 'this calendar' : 'this event')
	);

	/** Whatever else the rail is asked to hold replaces the form in it: `false` when the person keeps the form. */
	function openPanel(next: Exclude<typeof mode, 'view'>): boolean {
		if (!mayLeave()) return false;
		mode = next;
		void panel.show();
		return true;
	}
	// Back, or the panel's own close, took the entry away.
	$effect(() => {
		if (panel.open) return;
		untrack(() => {
			// Back on a phone has already left the entry: staying means putting it back.
			if (!mayLeave()) return void panel.show();
			// Out of a calendar's settings Back goes where its Done does: to the list they were opened from.
			if ((mode === 'calendar' || mode === 'import') && settingsFrom === 'calendars') {
				mode = 'calendars';
				return void panel.show();
			}
			mode = 'view';
			editing = null;
		});
	});

	function startNew(at: Date = anchor, until: Date | null = null, preset: typeof draftPreset = null) {
		if (!openPanel('new')) return;
		draftPreset = preset;
		// No time picked (midnight, which the editor reads as 09:00) and the day is
		// today: the next full hour, rather than a nine o'clock already gone.
		const hour = new Date().getHours();
		if (!until && at.getTime() === startOfDay(new Date()).getTime() && hour >= 9 && hour < 23) {
			at = new Date(at);
			at.setHours(hour + 1);
		}
		anchor = startOfDay(at);
		draftAt = at;
		draftEnd = until;
		editing = null;
		editorError = null;
	}

	function startEdit(event: CalendarEvent) {
		if (!openPanel('edit')) return;
		editing = event;
		editorError = null;
	}

	function openEvent(event: CalendarEvent) {
		openedAt = performance.now();
		if (!openPanel('event')) return;
		editing = event;
		editorError = null;
	}

	/**
	 * A tap opens the event, the rail takes its width out of the grid, and the
	 * tap's own click then lands on the empty slot that moved under the finger.
	 * ponytail: told apart by the clock; the grid's `onEvUp` swallowing that click
	 * (as it does after a drag) is the fix upstream.
	 */
	let openedAt = 0;

	function closePanel() {
		mode = 'view';
		editing = null;
		void panel.hide();
	}

	async function save(draft: EventDraft) {
		saving = true;
		editorError = null;
		try {
			if (mode === 'edit' && editing) {
				await updateEvent({
					id: editing.id,
					previousCalendarIds: editing.calendarIds,
					timeZone,
					...draft,
					// The write goes to the account the event lives in, whatever the
					// draft says — the editor only offers calendars from that account.
					accountId: editing.accountId
				});
				flash('Event saved');
			} else {
				const { occurrence: _ignored, ...create } = draft;
				await createEvent({ timeZone, ...create });
				flash('Event created');
			}
			await reload();
			closePanel();
		} catch (cause) {
			editorError = messageOf(cause, 'The event could not be saved.');
		} finally {
			saving = false;
		}
	}

	/**
	 * A drag landed. One occurrence of a repeating event moves on its own —
	 * the same rule the editor states when you open an instance — because the
	 * synthetic id is what JMAP records the override against.
	 */
	async function moveEvent(row: TimelineEvent, start: Date, end: Date) {
		const event = sourceOf(row);
		if (!event) return;
		const calendarId = event.calendarIds[0];
		if (!calendarId) return;
		if (!mayChange(event)) {
			// The grid lets any block be dragged; this one's calendar is read-only.
			await reload();
			flash(`“${event.title}” is in a calendar you can only read.`);
			return;
		}
		try {
			await updateEvent({
				id: event.id,
				accountId: event.accountId,
				previousCalendarIds: event.calendarIds,
				calendarId,
				title: event.title,
				start: event.allDay
					? `${toDateInputValue(start)}T00:00:00`
					: formatJmapQueryBound(start),
				duration: durationBetween(start, end, event.allDay),
				timeZone,
				allDay: event.allDay,
				description: event.description ?? '',
				location: event.location ?? '',
				// A drag moves an event; it never edits the rule behind it. Without
				// this a dragged occurrence would write its own rule over the series.
				keepRecurrence: true,
				occurrence: isRecurringInstance(event),
				recurrence: null
			});
			await reload();
			flash(isRecurringInstance(event) ? 'This occurrence moved' : 'Event moved');
		} catch (cause) {
			// The grid has already drawn the event where it was dropped; putting
			// the server's answer back is what undoes it.
			await reload();
			flash(messageOf(cause, 'The event could not be moved.'));
		}
	}

	async function remove(event: CalendarEvent) {
		// The first occurrence can come back as the series itself, rule and all.
		const series = isRecurringInstance(event) || Boolean(event.recurrenceRule);
		const confirmed = await ask(
			series
				? { title: `Delete every occurrence of “${event.title}”?`, body: 'Repeating events are deleted as a series.', action: 'Delete series' }
				: { title: `Delete “${event.title}”?`, action: 'Delete event' }
		);
		if (!confirmed) return;
		saving = true;
		try {
			await deleteEvent({ id: event.baseEventId ?? event.id, accountId: event.accountId });
			await reload();
			closePanel();
			flash('Event deleted');
		} catch (cause) {
			editorError = messageOf(cause, 'The event could not be deleted.');
		} finally {
			saving = false;
		}
	}

	async function toggleCalendar(calendar: Calendar, visible: boolean) {
		if (isHolidays(calendar)) return setPref('showHolidays', visible);
		if (isFeed(calendar))
			return setPref('calendarFeeds', prefs.calendarFeeds.map((feed) => (feed.id === calendar.id ? { ...feed, visible } : feed)));
		try {
			await setCalendarVisible({ id: calendar.id, accountId: calendar.accountId, visible });
		} catch (cause) {
			flash(messageOf(cause, 'Could not update the calendar'));
		}
	}

	/** The calendar whose settings are open, by key: its object is replaced on every refresh. */
	let settingsKey = $state<string | null>(null);
	/** Settings opened from the calendar list go back to it. */
	let settingsFrom = $state<'view' | 'calendars'>('view');
	const settingsCalendar = $derived(calendarList.find((calendar) => calendarKey(calendar) === settingsKey) ?? null);

	function openSettings(calendar: Calendar) {
		const from = mode === 'calendars' ? 'calendars' : 'view';
		if (!openPanel('calendar')) return;
		settingsFrom = from;
		settingsKey = calendarKey(calendar);
	}

	/** Out of a calendar's settings: to the list it was opened from, or shut. */
	function leaveSettings() {
		if (settingsFrom === 'calendars') mode = 'calendars';
		else closePanel();
	}

	/** Import and subscribe open from the calendar list, and go back to it the same way. */
	function openImport() {
		const from = mode === 'calendars' ? 'calendars' : 'view';
		if (!openPanel('import')) return;
		settingsFrom = from;
	}

	let panes = $state<HTMLElement>();
	/**
	 * Escape closes what the rail holds — an editor steps back the way Cancel
	 * does. Heard on the window: the button that opened a panel is gone once it
	 * is open, and focus with it (to `<body>`). Keys from the header's own menus
	 * are theirs.
	 */
	function escape(event: KeyboardEvent) {
		// A select's open list takes its own Escape.
		if (event.key !== 'Escape' || event.defaultPrevented || event.target instanceof HTMLSelectElement) return;
		if (event.target !== document.body && !panes?.contains(event.target as Node)) return;
		if (quick && mode === 'view') return void (event.preventDefault(), closeQuick());
		if (mode === 'view') return;
		event.preventDefault();
		if (!mayLeave()) return;
		if (mode === 'edit' && editing) mode = 'event';
		else if (mode === 'calendar' || mode === 'import') leaveSettings();
		else closePanel();
	}

	let addingCalendar = $state(false);
	async function addCalendar(name: string) {
		addingCalendar = true;
		try {
			await createCalendar({ name });
			flash('Calendar created');
		} catch (cause) {
			flash(messageOf(cause, 'Could not create the calendar'));
		} finally {
			addingCalendar = false;
		}
	}

	/* ── The day's voice ──────────────────────────────────────────────── */

	/** The coming week, for what the status line says: in something, free until what, or done for today. */
	const ahead = $derived(
		session && calendarsState?.supported
			? eventsRemote({ after: formatJmapQueryBound(today), before: formatJmapQueryBound(addDays(today, 8)), timeZone })
			: undefined
	);
	let aheadFeeds = $state<CalendarEvent[]>([]);
	$effect(() => {
		prefs.calendarFeeds;
		void feedsIn(today, addDays(today, 8)).then((list) => (aheadFeeds = list));
	});
	let now = $state(new Date());
	$effect(() => {
		const timer = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(timer);
	});
	const voice = $derived.by(() => {
		const list = ahead?.current;
		if (!list) return null;
		return dayVoice(
			[...list, ...aheadFeeds].filter((event) => calendarsOf(event).some((calendar) => calendar?.isVisible !== false)),
			now
		);
	});
	let statusLine = $state<CalendarStatusLine | null>(null);

	/* ── Quick add ───────────────────────────────────────────────────── */

	/** The one-line add is open, on a drawn slot or a free gap, or on nothing yet. */
	let quick = $state<{ slot: { start: Date; end: Date } | null } | null>(null);
	/** The event the line would make, drawn on the grid as a ghost while it is typed. */
	let ghost = $state<TimelineEvent | null>(null);
	let quickSaving = $state(false);
	let quickError = $state<string | null>(null);
	let draftPreset = $state<ComponentProps<typeof EventEditor>['preset']>(null);

	function openQuick(slot: { start: Date; end: Date } | null = null) {
		if (!calendarsState?.supported || readOnly) return;
		// The grid it draws on has to be in sight: a phone's panel covers it, and an open form is another way in.
		if (railOpen && (phone || mode === 'new' || mode === 'edit' || mode === 'event')) {
			if (!mayLeave()) return;
			closePanel();
		}
		quickError = null;
		quick = { slot };
	}

	function closeQuick() {
		quick = null;
		quickError = null;
		if (ghost) {
			ghost = null;
			dataVersion++;
		}
	}

	function preview(reading: Reading | null) {
		if (!quick) return;
		ghost = reading && {
			id: 'ghost',
			title: reading.event.title || 'New event',
			start: reading.event.start,
			end: reading.event.end,
			allDay: reading.event.allDay,
			color: reading.calendar.color ?? 'var(--z-accent)',
			status: 'tentative',
			data: { readOnly: true, ghost: true }
		};
		// Go to where it lands, then show it there.
		if (reading) {
			const day = startOfDay(reading.event.start).getTime();
			if (day < span[0]!.getTime() || day > span[span.length - 1]!.getTime()) anchor = new Date(day);
			setTimeout(() => {
				document.querySelector('.z-cal [data-event-id="ghost"]')?.scrollIntoView({ block: 'nearest', behavior: motion() });
			}, 250);
		}
		dataVersion++;
	}

	async function addQuick({ event, calendar }: Reading) {
		quickSaving = true;
		quickError = null;
		const title = event.title || 'New event';
		try {
			await createEvent({
				calendarId: calendar.id,
				accountId: calendar.accountId ?? null,
				title,
				start: event.allDay ? `${toDateInputValue(event.start)}T00:00:00` : formatJmapQueryBound(event.start),
				duration: durationBetween(event.start, event.end, event.allDay),
				timeZone,
				allDay: event.allDay,
				description: '',
				location: event.location,
				recurrence: event.recurrence
			});
			closeQuick();
			await reload();
			flash(`Added “${title}”`);
		} catch (cause) {
			quickError = messageOf(cause, 'The event could not be added.');
		} finally {
			quickSaving = false;
		}
	}

	/** "More options": the line so far, in the whole form. */
	function moreQuick(reading: Reading | null) {
		const slot = quick?.slot ?? null;
		closeQuick();
		if (!reading) return startNew(slot?.start, slot?.end ?? null);
		const { event, calendar } = reading;
		startNew(event.start, event.end, {
			title: event.title,
			location: event.location,
			allDay: event.allDay,
			recurrence: event.recurrence,
			calendar
		});
	}

	const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const motion = (): ScrollBehavior => (reduced() ? 'auto' : 'smooth');

	/* ── Out of sight, up and down ──────────────────────────────────── */

	/**
	 * A day opens an hour before now, so the morning's events are above the
	 * fold with nothing to say they are there. Counted off the drawn blocks:
	 * the grid's geometry is the package's, and this is the only honest read.
	 */
	let calEl = $state<HTMLElement>();
	let edges = $state({ above: 0, below: 0, top: 0 });
	const blocks = (scroller: Element) =>
		[...scroller.querySelectorAll<HTMLElement>('.tw-ev, .mb-event')].filter(
			(block) =>
				!block.matches('[data-event-id^="gap:"], [data-event-id="ghost"]') &&
				!block.style.getPropertyValue('--ev-color').includes('transparent')
		);
	function countEdges() {
		const scroller = calEl?.querySelector('.tw-scroll, .mb-grid');
		if (!calEl || !scroller || view !== 'day') return void (edges = { above: 0, below: 0, top: 0 });
		const box = scroller.getBoundingClientRect();
		let above = 0;
		let below = 0;
		for (const block of blocks(scroller)) {
			const rect = block.getBoundingClientRect();
			if (rect.bottom <= box.top + 6) above++;
			else if (rect.top >= box.bottom - 6) below++;
		}
		edges = { above, below, top: box.top - calEl.getBoundingClientRect().top };
	}
	function toEdge(up: boolean) {
		const scroller = calEl?.querySelector('.tw-scroll, .mb-grid');
		if (!scroller) return;
		const box = scroller.getBoundingClientRect();
		const rects = blocks(scroller).map((block) => block.getBoundingClientRect());
		const target = up
			? rects.filter((rect) => rect.bottom <= box.top + 6).sort((a, b) => b.top - a.top)[0]
			: rects.filter((rect) => rect.top >= box.bottom - 6).sort((a, b) => a.top - b.top)[0];
		if (target) scroller.scrollBy({ top: target.top - box.top - box.height / 3, behavior: motion() });
	}
	$effect(() => {
		const root = calEl;
		view;
		if (!root) return;
		let frame = 0;
		const schedule = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(countEdges);
		};
		const observer = new MutationObserver(schedule);
		observer.observe(root, { childList: true, subtree: true });
		root.addEventListener('scroll', schedule, true);
		schedule();
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			root.removeEventListener('scroll', schedule, true);
		};
	});

	/* ── Opening an event: the block becomes the panel ──────────────── */

	let railEl = $state<HTMLElement>();
	/** A tinted card flies from the block that was clicked to the rail, so the eye follows it there. */
	async function morph(from: DOMRect | undefined, color: string) {
		if (!from || phone || reduced()) return;
		await tick();
		const to = railEl?.getBoundingClientRect();
		if (!to || !from.width || !from.height) return;
		const card = document.createElement('div');
		Object.assign(card.style, {
			position: 'fixed',
			left: `${from.left}px`,
			top: `${from.top}px`,
			width: `${from.width}px`,
			height: `${from.height}px`,
			transformOrigin: '0 0',
			background: `color-mix(in srgb, ${color} 22%, var(--z-surface))`,
			boxShadow: 'var(--z-shadow-panel)',
			pointerEvents: 'none',
			zIndex: '50'
		});
		document.body.append(card);
		const animation = card.animate(
			[
				{ transform: 'none', opacity: 0.95 },
				{
					transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${Math.min(to.height, 240) / from.height})`,
					opacity: 0
				}
			],
			{ duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' }
		);
		animation.onfinish = animation.oncancel = () => card.remove();
	}

	/* ── Keys ────────────────────────────────────────────────────────── */

	function keys(event: KeyboardEvent) {
		if (event.key === 'Escape') return escape(event);
		if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
		const target = event.target as HTMLElement;
		if (target.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('dialog[open]')) return;
		// Arrows belong to whatever has focus in the grid; letters work from anywhere on the page.
		const bare = target === document.body;
		const open = mode === 'event' && editing && mayChange(editing) ? editing : null;
		const act: Record<string, (() => unknown) | undefined> = {
			n: () => openQuick(),
			c: () => startNew(),
			t: () => (anchor = today),
			j: () => step(1),
			k: () => step(-1),
			ArrowRight: bare ? () => step(1) : undefined,
			ArrowLeft: bare ? () => step(-1) : undefined,
			d: () => (view = 'day'),
			w: () => (view = 'week'),
			'/': () => calendarsState?.supported && openPanel('search'),
			e: open ? () => startEdit(open) : undefined,
			'#': open ? () => remove(open) : undefined,
			'?': () => statusLine?.showKeys()
		};
		const run = act[event.key];
		if (!run) return;
		event.preventDefault();
		run();
	}

	const railOpen = $derived(mode !== 'view');
	/** Nothing to drag an event onto if none of your calendars take writes. */
	const readOnly = $derived(
		!calendarList.some((calendar) => calendar.myRights.mayWriteAll || calendar.myRights.mayWriteOwn)
	);
</script>

<svelte:head><title>{shell.title('Calendar')}</title></svelte:head>

<svelte:window onkeydown={keys} ononline={() => failed && void reload()} />

<SectionShell title="Calendar">
	{#snippet controls()}
		<!-- A phone's panel covers the grid: what would move the grid steps out with it. -->
		<div class="contents {railOpen ? 'max-md:hidden' : ''}">
			<!-- Under 1024px the header shares its width with the section tabs: letters, as on a phone. -->
			<div class="z-group shrink-0" role="group" aria-label="View">
				{#each VIEWS as option (option.value)}
					<button
						type="button"
						class="z-segment !px-2.5 max-sm:!px-2 pointer-coarse:min-[360px]:max-md:!min-w-10"
						aria-pressed={view === option.value}
						aria-label={option.label}
						title={option.label}
						onclick={() => (view = option.value)}
					>
						<span class="max-lg:hidden">{option.label}</span>
						<span class="lg:hidden">{option.short}</span>
					</button>
				{/each}
			</div>

			<!-- On touch as tall as the bar's other buttons (base.css makes those 40px), and as wide where that
			     leaves the date its room: not at 320px, nor beside a tablet's section tabs. -->
			<div
				class="flex min-w-0 items-center rounded-[6px] border border-[var(--z-line)] bg-[var(--z-surface)] shadow-[var(--z-shadow-tactile)]"
			>
				<button
					type="button"
					class="flex h-[30px] w-7 shrink-0 items-center justify-center max-sm:w-6 pointer-coarse:h-10 pointer-coarse:min-[360px]:max-md:!w-10 pointer-coarse:lg:!w-10 rounded-l-[5px] border-r border-[var(--z-line)] text-[var(--z-strong)] hover:bg-[var(--z-hover)]"
					onclick={() => step(-1)}
					aria-label="Previous"
				>
					<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
				</button>
				<!-- As wide as the date it shows; it gives way before anything else in the bar. -->
				<button
					type="button"
					class="h-[30px] min-w-0 max-w-[42vw] truncate pointer-coarse:h-10 bg-[var(--z-sunken)] px-3 text-[13px] font-semibold text-[var(--z-ink)] max-lg:px-2 lg:min-w-[150px] max-sm:px-1 max-[359px]:!px-0.5 max-[359px]:text-[12px]"
					onclick={() => (anchor = today)}
					title="Back to today"
				>
					{title}
				</button>
				<button
					type="button"
					class="flex h-[30px] w-7 shrink-0 items-center justify-center max-sm:w-6 pointer-coarse:h-10 pointer-coarse:min-[360px]:max-md:!w-10 pointer-coarse:lg:!w-10 rounded-r-[5px] border-l border-[var(--z-line)] text-[var(--z-strong)] hover:bg-[var(--z-hover)]"
					onclick={() => step(1)}
					aria-label="Next"
				>
					<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
				</button>
			</div>
		</div>

		<!-- Wherever the calendars are not a sidebar, they open in the rail. -->
		<button
			type="button"
			class="btn-tactile shrink-0 !px-2 {railOpen ? 'xl:hidden' : 'lg:hidden'}"
			aria-label="Calendars"
			aria-pressed={mode === 'calendars'}
			onclick={() => (mode === 'calendars' ? closePanel() : openPanel('calendars'))}
			disabled={!calendarsState?.supported}
		>
			<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.5" y="3" width="11" height="10.5" rx="2" stroke="currentColor" stroke-width="1.5" /><path d="M2.5 6.5h11M5.5 1.75v2.5M10.5 1.75v2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
		</button>

		<button
			type="button"
			class="btn-tactile shrink-0 gap-1.5 max-xl:!px-2"
			onclick={() => (quick ? closeQuick() : openQuick())}
			aria-pressed={quick !== null}
			title="New event (n)"
			disabled={!calendarsState?.supported || readOnly}
		>
			<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
			<span class="max-xl:sr-only">New event</span>
		</button>
	{/snippet}

	<!-- Above both columns: on a phone the panel covers the grid, and what it did is said here. -->
	{#if notice}
		<p
			class="shrink-0 border-b border-[var(--z-hairline)] bg-[var(--z-hover)] px-4 py-1.5 text-[12px] font-medium text-[var(--z-muted)]"
			role="status"
		>
			{notice}
		</p>
	{/if}

	<!-- On touch every button and field in the panes is a fingertip tall, as the header's are (base.css); a phone's selects are 16px, under which iOS zooms the page on focus. -->
	<div class="flex min-h-0 flex-1 pointer-coarse:[&_:is(.btn-tactile,.z-segment,.z-field)]:min-h-10 pointer-coarse:[&_:is(.btn-tactile,.z-segment)]:min-w-10 max-md:[&_select]:text-base" bind:this={panes}>
		<!-- Calendars. Under 1280px this and the rail together leave the grid three
		     day columns, so while the rail is open the sidebar steps out and the
		     header's Calendars button stands in for it. -->
		<aside
			class="flex w-[240px] shrink-0 flex-col border-r border-[var(--z-line)] bg-[var(--z-surface)] {railOpen ? 'max-xl:hidden' : 'max-lg:hidden'}"
			aria-label="Calendars"
		>
			{#if calendarsResource?.error}
				<p class="px-5 py-4 text-[12.5px] text-[var(--z-ch-discard-ink)]">Could not load calendars.</p>
			{:else if !calendarsState}
				<ul class="space-y-1 px-3 py-4">
					{#each [1, 2] as n (n)}<li class="z-skeleton h-[32px] rounded-[8px] bg-[var(--z-sunken)]"></li>{/each}
				</ul>
			{:else if !calendarsState.supported}
				<p class="px-5 py-4 text-[12.5px] leading-relaxed text-[var(--z-soft)]">
					This mail server does not offer calendars over JMAP.
				</p>
			{:else}
				<CalendarList
					calendars={calendarList}
					primaryAccountId={calendarsState.primaryAccountId}
					onToggle={toggleCalendar}
					onEdit={openSettings}
					onAdd={addCalendar}
					onImport={openImport}
					adding={addingCalendar}
				/>
			{/if}
		</aside>

		<!-- The grid -->
		<div class="relative flex min-w-0 flex-1 flex-col {railOpen ? 'max-md:hidden' : ''}">
			{#if phone && !quick && calendarsState?.supported}
				<CalendarStatusLine phone {voice} {colorOf} onOpen={openEvent} />
			{/if}
			{#if quick && calendarsState}
				<QuickAddLine
					calendars={calendarList}
					slot={quick.slot}
					saving={quickSaving}
					error={quickError}
					onPreview={preview}
					onSave={addQuick}
					onMore={moreQuick}
					onClose={closeQuick}
				/>
			{/if}
			{#if failed === 'kept'}
				<p class="shrink-0 border-b border-[var(--z-hairline)] px-4 py-1.5 text-[12.5px] text-[var(--z-ch-discard-ink)]" role="alert">
					Could not refresh the calendar — showing it as last loaded.
					<button type="button" class="underline" onclick={reload}>Retry</button>
				</p>
			{/if}
			<!--
				The grid scrolls itself — sticky day headings, and the week scroll
				scrolling under a drag — so it needs a real height, not `auto`.
				`bind:clientHeight` is a ResizeObserver in two words.
				It stays mounted under a failure, so the next week asked for is asked for
				(`isolate`: its sticky headings stay under what covers it then).
			-->
			<div class="z-cal relative isolate min-h-0 flex-1" bind:this={calEl} bind:clientHeight={gridHeight} inert={failed === 'nothing'}>
				<CalendarGrid
					{adapter}
					view={viewId}
					currentDate={gridDate}
					theme={ZAUR_THEME}
					autoTheme={false}
					mondayStart
					height={gridHeight || 600}
					borderRadius={0}
					eventFill={0.2}
					eventBar={3}
					{readOnly}
					{locale}
					showModePills={false}
					showNavigation={false}
					snapInterval={15}
					minDuration={15}
					mobile={phone}
					ondatechange={(date) => {
						// `currentDate` is controlled, so the grid echoes back what it
						// was handed: taking the echo as a change feeds itself forever.
						//
						// The week scroll also reports the Monday of whichever week sits
						// at its centre — on mount too, before anyone scrolls. Inside
						// the anchored week that is an echo, not navigation: taking it
						// would land a later switch to Day on Monday instead of the day
						// we were on. Another week is a real scroll.
						const next = startOfDay(date).getTime();
						const inSpan = next >= span[0]!.getTime() && next <= span[span.length - 1]!.getTime();
						if (view === 'day' ? next !== anchor.getTime() : !inSpan)
							anchor = new Date(next);
					}}
					oneventclick={(row, rect) => {
						if (row.data?.gap) return openQuick({ start: row.start, end: row.end });
						const event = sourceOf(row);
						if (!event) return;
						const opening = mode !== 'event' || editing?.id !== event.id;
						openEvent(event);
						if (opening && mode === 'event') void morph(rect, row.color ?? 'var(--z-accent)');
					}}
					oneventcreate={({ start, end }) => performance.now() - openedAt > 400 && openQuick({ start, end })}
					oneventmove={(row, start, end) => void moveEvent(row, start, end)}
				>
					<!-- The shell's header already carries the date and the views. -->
					{#snippet header()}{/snippet}
				</CalendarGrid>
				{#if edges.above}
					<button type="button" class="z-cal-edge" style:top="{edges.top + 8}px" onclick={() => toEdge(true)}>↑ {edges.above} earlier</button>
				{/if}
				{#if edges.below}
					<button type="button" class="z-cal-edge" style:bottom="12px" onclick={() => toEdge(false)}>↓ {edges.below} later</button>
				{/if}
			</div>
			{#if failed === 'nothing'}
				<!-- Over the grid, not beside it: an empty week under this line would still read as a free one. -->
				<div class="absolute inset-0 bg-[var(--z-surface)] p-6 text-center text-[13px] text-[var(--z-ch-discard-ink)]" role="alert">
					Could not load events.
					<div class="mt-3"><button type="button" class="btn-tactile !h-[28px]" onclick={reload}>Retry</button></div>
				</div>
			{/if}
		</div>

		<!-- An event, the editor, or the calendars -->
		{#if railOpen}
			<div class="flex w-[380px] shrink-0 flex-col border-l border-[var(--z-hairline)] max-md:w-full max-md:border-l-0" bind:this={railEl}>
				{#if mode === 'search' && calendarsState}
					<EventSearch visible={(event) => calendarsOf(event).some((calendar) => calendar?.isVisible !== false)} {colorOf} onOpen={openEvent} onClose={closePanel} />
				{:else if mode === 'event' && editing}
					<EventView
						event={editing}
						calendars={calendarsOf(editing).filter((calendar) => calendar !== undefined)}
						writable={mayChange(editing)}
						busy={saving}
						error={editorError}
						onEdit={() => startEdit(editing!)}
						onDelete={() => remove(editing!)}
						onClose={closePanel}
					/>
				{:else if mode === 'calendars' && calendarsState}
					<div class="flex items-center justify-between gap-2 border-b border-[var(--z-hairline)] px-4 py-3">
						<h2 class="text-[14px] font-semibold text-[var(--z-ink)]">Calendars</h2>
						<button type="button" class="btn-tactile !h-[30px]" onclick={closePanel}>Done</button>
					</div>
					<CalendarList
						calendars={calendarList}
						primaryAccountId={calendarsState.primaryAccountId}
						onToggle={toggleCalendar}
						onEdit={openSettings}
						onAdd={addCalendar}
						onImport={openImport}
						adding={addingCalendar}
					/>
				{:else if mode === 'import' && calendarsState}
					<CalendarImport
						calendars={calendarList}
						onDone={(message) => {
							flash(message);
							void reload();
						}}
						onClose={leaveSettings}
					/>
				{:else if mode === 'calendar' && settingsCalendar && isFeed(settingsCalendar)}
					{@const feed = prefs.calendarFeeds.find((f) => f.id === settingsCalendar.id)}
					{#if feed}
						<FeedSettings
							bind:this={settings}
							{feed}
							onDone={(message, closed) => {
								flash(message);
								if (closed) leaveSettings();
							}}
							onClose={() => mayLeave() && leaveSettings()}
						/>
					{/if}
				{:else if mode === 'calendar' && settingsCalendar && isHolidays(settingsCalendar)}
					<HolidaySettings detected={detectedCountry} onClose={leaveSettings} />
				{:else if mode === 'calendar' && settingsCalendar && calendarsState}
					<CalendarSettings
						bind:this={settings}
						calendar={settingsCalendar}
						calendars={calendarList}
						own={!calendarsState.primaryAccountId ||
							!settingsCalendar.accountId ||
							settingsCalendar.accountId === calendarsState.primaryAccountId}
						canShare={calendarsState.canShare}
						onDone={(message, closed) => {
							flash(message);
							if (!closed) return;
							leaveSettings();
							void reload(); // its events went with it
						}}
						onClose={() => mayLeave() && leaveSettings()}
					/>
				{:else if (mode === 'new' || mode === 'edit') && calendarsState}
					<EventEditor
						bind:this={editor}
						event={mode === 'edit' ? editing : null}
						day={draftAt}
						until={draftEnd}
						calendars={calendarList}
						{saving}
						error={editorError}
						meetEnabled={page.data.meetEnabled === true}
						preset={mode === 'new' ? draftPreset : null}
						onSave={save}
						onDelete={mode === 'edit' && editing ? () => remove(editing!) : undefined}
						onCancel={() => (mode === 'edit' && editing ? (mode = 'event') : closePanel())}
					/>
				{/if}
			</div>
		{/if}
	</div>
	{#if calendarsState?.supported}
		<CalendarStatusLine bind:this={statusLine} {voice} {colorOf} onOpen={openEvent} />
	{/if}
</SectionShell>

<style>
	/*
	 * The grid's look is the package's: each event a wash of its calendar's
	 * colour with a rail on its leading edge (`eventFill`, `eventBar`), the
	 * shell's tokens through `ZAUR_THEME`. What is left here is the phone.
	 *
	 * `:global` because the markup is not ours; the `.z-cal` in front both
	 * fences it to this grid and outranks the package's own scoped rules.
	 */
	.z-cal :global {
		/* Still asking the server is not an empty day. */
		[aria-busy='true'] .mb-empty {
			display: none;
		}

		/* A quarter-hour block on a phone is one line of text: the resize grips
		   and the "up next" tag would sit on top of it. It is resized in the editor. */
		.mb-event--short .mb-ev-handle,
		.mb-event--short .mb-ev-next-badge {
			display: none;
		}

		/* Nor does the tag fit a block that shares its hour with two others. */
		.mb-event {
			container-type: inline-size;
		}

		@container (max-width: 150px) {
			.mb-ev-next-badge {
				display: none;
			}
		}

		/* The same in the day grid on a touch tablet, where the grips always show. */
		@media (pointer: coarse) {
			.tw-ev--short .tw-ev-handle {
				display: none;
			}
		}

		/* All-day events are a wash with a rail, like the timed ones, not solid
		   bars of saturated colour shouting over the hours under them. */
		.wg-ad,
		.tw-ad,
		.mb-allday-chip {
			background: color-mix(in srgb, var(--ev-color) 20%, var(--z-surface));
			color: var(--z-ink);
			box-shadow: inset 3px 0 0 var(--ev-color);
		}
		.wg-ad:hover,
		.tw-ad:hover,
		.mb-allday-chip:hover {
			filter: none;
			background: color-mix(in srgb, var(--ev-color) 30%, var(--z-surface));
		}

		/* Free time: a quiet dashed outline with its length, there to be taken. */
		.tw-ev[data-event-id^='gap:'],
		.mb-event[style*='--ev-color: transparent'] {
			background: none;
			box-shadow: none;
			outline: 1px dashed var(--z-line);
			outline-offset: -1px;
			cursor: pointer;
			z-index: 1;
		}
		.tw-ev[data-event-id^='gap:']:hover,
		.mb-event[style*='--ev-color: transparent']:hover {
			background: var(--z-hover);
		}
		:is(.tw-ev[data-event-id^='gap:'], .mb-event[style*='--ev-color: transparent'])
			:is(.tw-ev-stripe, .tw-ev-time, .tw-ev-loc, .mb-ev-time, .mb-ev-next-badge) {
			display: none;
		}
		:is(.tw-ev[data-event-id^='gap:'], .mb-event[style*='--ev-color: transparent']) :is(.tw-ev-title, .mb-ev-title) {
			color: var(--z-soft);
			font-weight: 500;
			font-size: 12px;
		}
		:is(.tw-ev[data-event-id^='gap:'], .mb-event[style*='--ev-color: transparent']):hover :is(.tw-ev-title, .mb-ev-title)::after {
			content: ' · add';
			color: var(--z-accent);
		}
		/* Gaps would take the phone's "up next" tag from the event after them; the line above the grid says it instead. */
		.mb-ev-next-badge {
			display: none;
		}

		/* The event quick add would make, before it is made. */
		.tw-ev[data-event-id='ghost'] {
			outline: 1px dashed var(--ev-color);
			outline-offset: -1px;
			animation: z-ghost 1.6s ease-in-out infinite alternate;
		}
	}

	@keyframes z-ghost {
		from {
			opacity: 1;
		}
		to {
			opacity: 0.6;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.z-cal :global(.tw-ev[data-event-id='ghost']) {
			animation: none;
		}
	}

	/* "↑ 2 earlier": what the scroll has out of sight. */
	.z-cal-edge {
		position: absolute;
		left: 50%;
		z-index: 20;
		translate: -50% 0;
		height: 24px;
		padding: 0 10px;
		border: 1px solid var(--z-line);
		border-radius: 999px;
		background: var(--z-surface);
		box-shadow: var(--z-shadow-tactile);
		color: var(--z-strong);
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
		transition: background 150ms;
	}
	.z-cal-edge:hover {
		background: var(--z-hover);
	}
</style>
