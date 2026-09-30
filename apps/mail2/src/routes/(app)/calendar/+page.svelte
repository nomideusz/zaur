<script lang="ts">
	import { untrack } from 'svelte';
	import { messageOf } from '#lib/errors';
	import { leaveGuard } from '#lib/leave-guard';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Calendar as CalendarGrid, fmtTime } from '@nomideusz/svelte-calendar';
	import type { CalendarViewId, TimelineEvent } from '@nomideusz/svelte-calendar';
	import type { Calendar, CalendarEvent } from '@zaur/mail-core';
	import { calendarAllowsWrites, calendarKey, eventKey, isRecurringInstance } from '@zaur/mail-core';
	import {
		addDays,
		durationBetween,
		formatEventTime,
		formatJmapQueryBound,
		formatMonthTitle,
		formatWeekRange,
		monthGrid,
		toDateInputValue,
		weekDays
	} from '@zaur/mail-core/utils/dates';
	import { extractMeetingGroup } from '@zaur/mail-core/utils/meet';
	import SectionShell from '#lib/components/mail/SectionShell.svelte';
	import EventEditor, { type EventDraft } from '#lib/components/calendar/EventEditor.svelte';
	import CalendarList from '#lib/components/calendar/CalendarList.svelte';
	import CalendarSettings from '#lib/components/calendar/CalendarSettings.svelte';
	import EventView from '#lib/components/calendar/EventView.svelte';
	import { eventsOnDay, shiftMonth, startOfDay } from '#lib/calendar/schedule';
	import { ZAUR_THEME, sourceOf, toTimelineEvent } from '#lib/calendar/bridge';
	import { LiveUpdates } from '#lib/mail/live';
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
	 */
	type View = 'day' | 'week' | 'roll' | 'month';
	const VIEWS: { value: View; label: string; short: string; id: CalendarViewId }[] = [
		{ value: 'day', label: 'Day', short: 'D', id: 'day-planner' },
		{ value: 'week', label: 'Week', short: 'W', id: 'week-planner' },
		{ value: 'roll', label: 'Roll', short: 'R', id: 'week-scroll' },
		{ value: 'month', label: 'Month', short: 'M', id: 'month-grid' }
	];

	const today = startOfDay(new Date());
	let anchor = $state(today);
	let view = $state<View>('week');
	const viewId = $derived(VIEWS.find((option) => option.value === view)!.id);
	// The roll view moves the grid's own focus to its centre week's Monday. A
	// fresh Date per view switch makes the grid take the anchor again, so the
	// next view opens on the day we kept, not the one the roll drifted to.
	const gridDate = $derived(view && new Date(anchor));

	let phone = $state(false);
	$effect(() => {
		const narrow = window.matchMedia('(max-width: 639px)');
		const sync = () => (phone = narrow.matches);
		sync();
		// Seven columns do not fit on a phone; the day does. Only on the way in —
		// after that the switcher is the person's, whatever size the screen is.
		if (narrow.matches) view = 'day';
		narrow.addEventListener('change', sync);
		return () => narrow.removeEventListener('change', sync);
	});

	// A phone shows Day and Month only: seven columns at 50px each is not a week,
	// and the segments it saves are what the date in the header needs.
	const views = $derived(
		phone ? VIEWS.filter((option) => option.value === 'day' || option.value === 'month' || option.value === view) : VIEWS
	);

	/**
	 * The phone's day view writes "now" beside its line as 24-hour "08:03",
	 * next to hours written "8a", and on top of the hour's own label when the
	 * two are within ten minutes. The markup is the package's, so the page
	 * keeps the minute: the label's text comes from here (`--z-now`, in the
	 * grid's own format) and the hour label it would touch steps out.
	 */
	let now = $state(new Date());
	$effect(() => {
		if (!phone) return;
		const timer = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(timer);
	});
	const nowText = $derived(`"${fmtTime(now)}"`);
	/** Which hour row (1-based, from midnight) the now label sits on, if any. */
	const nowRow = $derived(
		now.getMinutes() <= 10 ? now.getHours() + 1 : now.getMinutes() >= 50 ? now.getHours() + 2 : 0
	);

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
	const month = $derived(monthGrid(anchor.getFullYear(), anchor.getMonth(), 'monday'));
	/** The days the current view is asking the server about. */
	const span = $derived(
		view === 'month' ? month : view === 'day' ? [anchor] : weekDays(anchor, 'monday')
	);
	const range = $derived({
		after: formatJmapQueryBound(span[0]!),
		before: formatJmapQueryBound(addDays(span[span.length - 1]!, 1)),
		timeZone
	});

	function step(delta: number) {
		anchor =
			view === 'month'
				? shiftMonth(anchor, delta)
				: addDays(anchor, view === 'day' ? delta : 7 * delta);
	}

	// Under 1024px the header has no room for "Saturday, September 19", nor
	// for the year after a week that is plainly this one.
	const short = (date: Date) => date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	const title = $derived(
		view === 'month'
			? viewport.compact
				? anchor.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
				: formatMonthTitle(anchor.getFullYear(), anchor.getMonth())
			: view === 'day'
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

	/**
	 * A day in the month grid was picked (or its "+2 more"). Left to itself the
	 * grid swaps in its own day planner while our header still says Month; the
	 * page owns that. Beside the month sits the day's list, so picking a day
	 * fills it — under 1024px there is no room for the list (see `railOpen`),
	 * and picking a day goes to the day instead.
	 */
	function pickDay(date: Date) {
		anchor = startOfDay(date);
		if (viewport.compact) view = 'day';
	}

	/* ── Data ─────────────────────────────────────────────────────────── */

	const calendarsResource = $derived(session ? calendarsRemote() : undefined);
	const calendarsState = $derived(calendarsResource?.current ?? null);
	const calendarList = $derived(calendarsState?.calendars ?? []);
	const eventsResource = $derived(session && calendarsState?.supported ? eventsRemote(range) : undefined);

	// Push: a change made on the phone shows up here.
	$effect(() => {
		if (!session) return;
		const live = new LiveUpdates();
		live.start(({ calendar }) => {
			if (calendar) {
				void calendarsResource?.refresh();
				void reload();
			}
		});
		return () => live.stop();
	});

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
	$effect(() => {
		const list = eventsResource?.current;
		if (list) kept.set(rangeKey(range), list);
	});
	/** The day list's events: the server's answer, or the last one when asking again failed. */
	const loaded = $derived(eventsResource?.current ?? (eventsResource?.error ? kept.get(rangeKey(range)) : undefined));
	const visibleEvents = $derived(
		(loaded ?? []).filter((event) =>
			calendarsOf(event).some((calendar) => calendar?.isVisible !== false)
		)
	);
	const agenda = $derived(eventsOnDay(visibleEvents, anchor));

	function colorOf(event: CalendarEvent): string {
		return calendarsOf(event)[0]?.color ?? 'var(--z-accent)';
	}

	/** Whether any calendar it is filed in takes writes — the grid cannot tell per event. */
	function mayChange(event: CalendarEvent): boolean {
		return calendarsOf(event).some((calendar) => calendar !== undefined && calendarAllowsWrites(calendar));
	}

	/**
	 * The grid asks for the range it is actually drawing, which is the only
	 * honest contract: the week planner wants a week, the roll wants the ±8
	 * weeks it buffers. Remote queries are cached per range, so the day list
	 * beside a month and the grid behind it resolve to one request.
	 *
	 * Rebuilt whenever the calendars' visibility changes or a write lands —
	 * the grid reloads on a new adapter, and that is the only handle it gives.
	 */
	let gridHeight = $state(0);
	let dataVersion = $state(0);
	/**
	 * The bounds the grid last asked for. A remote query caches per argument, so
	 * refreshing the day list's copy leaves the grid's own copy stale — after a
	 * write both have to be told, and this is which one the grid holds.
	 * Plain, not `$state`: the adapter writes it from inside the grid's own
	 * load effect, and a signal there would feed back into that effect.
	 */
	let gridRange: { after: string; before: string; timeZone: string } | null = null;
	const adapter = $derived.by(() => {
		const by = calendarByKey;
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
					failed = null;
				} catch {
					// The grid draws a failed load as an empty week; see `kept`.
					const before = kept.get(rangeKey(bounds));
					failed = before ? 'kept' : 'nothing';
					list = before ?? [];
				}
				return list
					.filter((event) =>
						event.calendarIds.some(
							(id) => by.get(calendarKey({ id, accountId: event.accountId }))?.isVisible !== false
						)
					)
					.map((event) => toTimelineEvent(event, colorOf(event)));
			}
		};
	});

	/** Put the server's answer back in front of both the grid and the day list. */
	async function reload() {
		// Settled, not all: a refresh that fails still has to reach the grid, which says so.
		await Promise.allSettled([
			eventsResource?.refresh(),
			gridRange ? eventsRemote(gridRange).refresh() : null
		]);
		dataVersion++;
	}

	/* ── Editing ──────────────────────────────────────────────────────── */

	/**
	 * What the rail holds: the day (`view`), an event as it is, the editor, and
	 * — the grid's calendars are a sidebar only on a wide screen — the calendar
	 * list and one calendar's settings.
	 */
	let mode = $state<'view' | 'event' | 'new' | 'edit' | 'calendars' | 'calendar'>('view');
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

	/** An event form with something typed in it asks before it is dropped. */
	let editor = $state<ReturnType<typeof EventEditor> | null>(null);
	const mayLeave = leaveGuard(
		() => (mode === 'new' || mode === 'edit') && (editor?.isDirty() ?? false),
		'this event'
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
			mode = 'view';
			editing = null;
		});
	});

	function startNew(at: Date = anchor, until: Date | null = null) {
		if (!openPanel('new')) return;
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
		const prompt = series
			? `Delete every occurrence of “${event.title}”? Repeating events are deleted as a series.`
			: `Delete “${event.title}”?`;
		if (!confirm(prompt)) return;
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
		if (mode === 'view') return;
		event.preventDefault();
		if (!mayLeave()) return;
		if (mode === 'edit' && editing) mode = 'event';
		else if (mode === 'calendar') leaveSettings();
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

	const dayTitle = $derived(
		anchor.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
	);
	const panelOpen = $derived(mode !== 'view');
	/**
	 * The month grid needs the day's list beside it; a planner is already one.
	 * Under 1024px the list would leave seven columns half the screen (378px on
	 * a tablet held upright), so there the month has the width and a day opens
	 * as the Day view — the same line below which the calendars step out.
	 */
	const railOpen = $derived(panelOpen || (view === 'month' && !viewport.compact));
	/** Nothing to drag an event onto if none of your calendars take writes. */
	const readOnly = $derived(
		!calendarList.some((calendar) => calendar.myRights.mayWriteAll || calendar.myRights.mayWriteOwn)
	);
</script>

<svelte:head><title>Calendar · Zaur Mail</title></svelte:head>

<svelte:window onkeydown={escape} ononline={() => failed && void reload()} />

{#if nowRow && anchor.getTime() === startOfDay(now).getTime()}
	<!-- Only the hour rows are numbered, so which one hides is a rule written per minute. -->
	{@html `<style>.z-cal .mb-hour:nth-child(${nowRow}) .mb-hour-label{visibility:hidden}</style>`}
{/if}

<SectionShell title="Calendar">
	{#snippet controls()}
		<!-- A phone's panel covers the grid: what would move the grid steps out with it. -->
		<div class="contents {panelOpen ? 'max-md:hidden' : ''}">
			<!-- Under 1024px the header shares its width with the section tabs: letters, as on a phone. -->
			<div class="z-group shrink-0" role="group" aria-label="View">
				{#each views as option (option.value)}
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
			onclick={() => mode === 'new' || startNew()}
			disabled={!calendarsState?.supported}
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
					adding={addingCalendar}
				/>
			{/if}
		</aside>

		<!-- The grid -->
		<div class="relative flex min-w-0 flex-1 flex-col {panelOpen ? 'max-md:hidden' : ''}">
			{#if failed === 'kept'}
				<p class="shrink-0 border-b border-[var(--z-hairline)] px-4 py-1.5 text-[12.5px] text-[var(--z-ch-discard-ink)]" role="alert">
					Could not refresh the calendar — showing it as last loaded.
					<button type="button" class="underline" onclick={reload}>Retry</button>
				</p>
			{/if}
			<!--
				The grid scrolls itself — sticky day headings, and the roll view
				scrolling under a drag — so it needs a real height, not `auto`.
				`bind:clientHeight` is a ResizeObserver in two words.
				It stays mounted under a failure, so the next week asked for is asked for
				(`isolate`: its sticky headings stay under what covers it then).
			-->
			<div class="z-cal isolate min-h-0 flex-1" bind:clientHeight={gridHeight} inert={failed === 'nothing'} style:--z-now={nowText}>
				<CalendarGrid
					{adapter}
					view={viewId}
					currentDate={gridDate}
					theme={ZAUR_THEME}
					autoTheme={false}
					mondayStart
					height={gridHeight || 600}
					borderRadius={0}
					{readOnly}
					showModePills={false}
					showNavigation={false}
					snapInterval={15}
					minDuration={15}
					minColumnWidth={84}
					mobile={phone}
					ondayclick={pickDay}
					ondatechange={(date) => {
						// `currentDate` is controlled, so the grid echoes back what it
						// was handed: taking the echo as a change feeds itself forever.
						//
						// The roll view also reports the Monday of whichever week sits
						// at its centre — on mount too, before anyone scrolls. Inside
						// the anchored week that is an echo, not navigation: taking it
						// would land a later switch to Day on Monday instead of the day
						// we were on. Another week is a real scroll.
						const next = startOfDay(date).getTime();
						const inSpan = next >= span[0]!.getTime() && next <= span[span.length - 1]!.getTime();
						if (view === 'day' || view === 'month' ? next !== anchor.getTime() : !inSpan)
							anchor = new Date(next);
					}}
					oneventclick={(row) => {
						const event = sourceOf(row);
						if (event) openEvent(event);
					}}
					oneventcreate={({ start, end }) => performance.now() - openedAt > 400 && startNew(start, end)}
					oneventmove={(row, start, end) => void moveEvent(row, start, end)}
				>
					<!-- The shell's header already carries the date and the views. -->
					{#snippet header()}{/snippet}
				</CalendarGrid>
			</div>
			{#if failed === 'nothing'}
				<!-- Over the grid, not beside it: an empty week under this line would still read as a free one. -->
				<div class="absolute inset-0 bg-[var(--z-surface)] p-6 text-center text-[13px] text-[var(--z-ch-discard-ink)]" role="alert">
					Could not load events.
					<div class="mt-3"><button type="button" class="btn-tactile !h-[28px]" onclick={reload}>Retry</button></div>
				</div>
			{/if}
		</div>

		<!-- The day, or the editor -->
		{#if railOpen}
			<div
				class="flex w-[380px] shrink-0 flex-col border-l border-[var(--z-hairline)] max-md:w-full max-md:border-l-0 {panelOpen
					? ''
					: 'max-md:hidden'}"
			>
				{#if mode === 'event' && editing}
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
						adding={addingCalendar}
					/>
				{:else if mode === 'calendar' && settingsCalendar && calendarsState}
					<CalendarSettings
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
						onClose={leaveSettings}
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
						onSave={save}
						onDelete={mode === 'edit' && editing ? () => remove(editing!) : undefined}
						onCancel={() => (mode === 'edit' && editing ? (mode = 'event') : closePanel())}
					/>
				{:else}
					<div class="flex items-center justify-between gap-2 border-b border-[var(--z-hairline)] px-4 py-3">
						<h2 class="min-w-0 truncate text-[14px] font-semibold text-[var(--z-ink)]">{dayTitle}</h2>
						<button
							type="button"
							class="btn-tactile !h-[28px] shrink-0 text-[12px]"
							onclick={() => startNew()}
							disabled={!calendarsState?.supported}
						>
							New event
						</button>
					</div>
					<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
						{#if !loaded && eventsResource?.error}
							<p class="py-6 text-center text-[13px] text-[var(--z-ch-discard-ink)]" role="alert">
								Could not load events.
								<button type="button" class="underline" onclick={reload}>Retry</button>
							</p>
						{:else if !loaded && eventsResource?.loading}
							<ul class="space-y-2">
								{#each [1, 2, 3] as n (n)}<li class="z-skeleton h-[52px] rounded-[8px] bg-[var(--z-sunken)]"></li>{/each}
							</ul>
						{:else if agenda.length === 0}
							<p class="py-6 text-center text-[13px] text-[var(--z-faint)]">Nothing on this day.</p>
						{:else}
							<ul class="space-y-2" role="list">
								{#each agenda as event (eventKey(event))}
									{@const meeting = extractMeetingGroup(event.location)}
									<li class="relative">
										<button
											type="button"
											class="z-event w-full !flex-col !items-stretch !gap-0.5 !rounded-[8px] !px-3 !py-2 {meeting ? '!pr-[76px]' : ''}"
											style:--z-rail={colorOf(event)}
											onclick={() => openEvent(event)}
										>
											<span class="text-[13.5px] font-semibold">{event.title}</span>
											<span class="text-[12px] opacity-80">{formatEventTime(event)}</span>
											{#if meeting}
												<span class="truncate text-[12px] opacity-70">Zaur Meet</span>
											{:else if event.location}
												<span class="truncate text-[12px] opacity-70">{event.location}</span>
											{/if}
											<span class="text-[11px] opacity-60">
												{calendarsOf(event)[0]?.name ?? ''}{isRecurringInstance(event)
													? ' · Repeats'
													: ''}
											</span>
										</button>
										{#if meeting}
											<!-- A sibling, not inside the row: a link cannot sit in a button. -->
											<a
												class="btn-tactile btn-primary absolute top-2 right-2 !h-[26px] !px-2.5 !text-[12px]"
												href="/meet/{meeting}"
												target="_blank"
												rel="noopener"
											>
												Join
											</a>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</SectionShell>

<style>
	/*
	 * The grid's geometry is the package's; what a block looks like is ours.
	 * Every view hands its blocks the calendar's colour as `--ev-color` (the
	 * month as `--mg-chip-color`), so one recipe dresses all of them: a pastel
	 * fill, a stroke of the same hue, a 2px lip under it, ink mixed from the
	 * hue. Mixed against the surface and the ink, so dark mode is the same rule.
	 *
	 * `:global` because the markup is not ours; the `.z-cal` in front both
	 * fences it to this grid and outranks the package's own scoped rules.
	 */
	.z-cal :global {
		.tw-ev,
		.tw-ad,
		.tw-ghost:not(.tw-ghost--create),
		.wg-ev,
		.wg-ad,
		.mb-event,
		.mb-allday-chip,
		.mw-ev,
		.mg-chip:not(.mg-chip--custom) {
			--ev-hue: var(--ev-color, var(--mg-chip-color));
			--ev-fill: color-mix(in oklab, var(--ev-hue) 28%, var(--z-surface));
			--ev-ink: color-mix(in oklab, var(--ev-hue) 30%, var(--z-ink));
			border: 1px solid color-mix(in oklab, var(--ev-hue) 80%, var(--z-surface));
			border-bottom-width: 2px;
			border-radius: 6px;
			background: var(--ev-fill);
			color: var(--ev-ink);
			outline: none;
		}

		.tw-ev:hover,
		.tw-ad:hover,
		.wg-ev:hover,
		.wg-ad:hover,
		.mb-event:hover,
		.mw-ev:hover,
		.mg-chip:not(.mg-chip--custom):hover {
			background: color-mix(in oklab, var(--ev-hue) 38%, var(--z-surface));
		}

		/* Not yet certain, so not yet solid. */
		.tw-ev--tentative,
		.tw-ev--limited,
		.wg-ev--tentative,
		.wg-ev--limited {
			border-style: dashed;
		}

		/* A bar that runs on into the next day has no end to round off here. */
		.tw-ad--mid,
		.tw-ad--end:not(.tw-ad--start),
		.wg-ad--mid,
		.wg-ad--end:not(.wg-ad--start) {
			border-left-style: dashed;
			border-top-left-radius: 0;
			border-bottom-left-radius: 0;
		}

		/* The hue is the whole block now; a stripe or a dot would say it twice. */
		.tw-ev-stripe,
		.mb-ev-stripe,
		.mw-ev-stripe,
		.mb-allday-dot,
		.mg-chip-dot {
			display: none;
		}

		.tw-ev-body {
			padding: 3px 7px;
		}

		.tw-ev-title,
		.tw-ad-title,
		.tw-ghost-title,
		.wg-ev-title,
		.wg-ad-title,
		.mb-ev-title,
		.mw-ev-title,
		.mb-allday-title,
		.mg-chip-title {
			color: inherit;
			font-weight: 600;
		}

		.tw-ev-time,
		.tw-ev-loc,
		.tw-ad-span,
		.tw-ghost-time,
		.wg-ev-time,
		.wg-ev-loc,
		.mb-ev-time,
		.mb-ev-loc,
		.mw-ev-time,
		.mg-chip-time {
			color: inherit;
			font-weight: 500;
			opacity: 0.78;
		}

		/* What it is, then when: the title leads, and on a one-line block the
		   time sits at the far end of it. */
		.tw-ev-title {
			order: -1;
		}

		.tw-ev--compact .tw-ev-time {
			margin-left: auto;
		}

		.tw-ad {
			min-height: 22px;
		}

		/* ── The grid around them: quiet, one face, no washes ── */

		.tw-hd-wd,
		.wg-day-wd,
		.mg-head-cell {
			font-family: var(--font-sans);
			font-size: 12px;
			font-weight: 500;
			letter-spacing: 0;
			text-transform: none;
			color: var(--z-soft);
		}

		.tw-hd-num {
			font-size: 15px;
		}

		.tw-gutter-lb,
		.tw-ad-gutter-lb {
			font-size: 11.5px;
			color: var(--z-soft);
		}

		/* Yesterday is not greyer than today; its events already step back. */
		.tw-col.tw-col--past,
		.mg-cell.mg-cell--out {
			background: transparent;
		}

		.mg-daynum {
			font-size: 13px;
			color: var(--z-body);
		}

		.mg-cell--out .mg-daynum {
			color: var(--z-faint);
		}

		.mg-chip:not(.mg-chip--custom) {
			padding: 1px 6px;
			border-bottom-width: 1px;
		}

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

		/* "Now" in the grid's own words (see `now` above); its box keeps the gutter's width. */
		.mb-now-label {
			font-size: 0;
		}

		.mb-now-label::after {
			content: var(--z-now);
			font-size: 10px;
		}

		/* The same in the week grid on a touch tablet, where the grips always show. */
		@media (pointer: coarse) {
			.tw-ev--short .tw-ev-handle {
				display: none;
			}
		}
	}
</style>
