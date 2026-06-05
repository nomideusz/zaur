/**
 * createAgenda() — headless single-day agenda state.
 *
 * Returns reactive state for rendering a day's events with zero DOM.
 * Lighter than createCalendar: no view-state, drag, or selection engines.
 * Manages its own focus date, loads events from the adapter, and categorises
 * them into past / current / upcoming buckets that update every second.
 *
 * Must be called during component initialisation (Svelte 5 rune scope).
 *
 * @example
 * ```svelte
 * <script>
 *   import { createAgenda, createMemoryAdapter } from '@nomideusz/svelte-calendar';
 *
 *   const adapter = createMemoryAdapter([...]);
 *   const agenda = createAgenda({ adapter });
 * </script>
 *
 * <h2>{agenda.dateLabel}</h2>
 * <button onclick={agenda.prev}>←</button>
 * <button onclick={agenda.next}>→</button>
 *
 * {#each agenda.upcoming as ev}
 *   <div>
 *     <span>{agenda.fmtTime(ev.start)}</span>
 *     <span>{ev.title}</span>
 *     <span>{agenda.eta(ev)}</span>
 *   </div>
 * {/each}
 * ```
 */
import { untrack } from 'svelte';
import { createEventStore } from '../engine/event-store.svelte.js';
import { createClock } from '../core/clock.svelte.js';
import { sod, DAY_MS, isAllDay, isMultiDay } from '../core/time.js';
import { fmtTime as _fmtTime, fmtDuration } from '../core/locale.js';
import { timeUntilMs, progress as _progress, groupIntoSlots } from '../views/shared/format.js';
import type { TimelineEvent } from '../core/types.js';
import type { CalendarAdapter } from '../adapters/types.js';

// ─── Options ────────────────────────────────────────────

export interface AgendaOptions {
	/** Data source (required). Can be a getter for reactive adapters. */
	adapter: CalendarAdapter | (() => CalendarAdapter);
	/** Initial date to focus on (default: today) */
	initialDate?: Date;
	/** BCP 47 locale tag (e.g. 'en-US', 'pl-PL') */
	locale?: string;
	/** Number of days to load ahead of focus date for the upcoming list (default: 7) */
	lookahead?: number;
}

// ─── Return type ────────────────────────────────────────

export interface HeadlessAgenda {
	// ── Reactive state ──

	/** The focused date */
	readonly focusDate: Date;
	/** Start-of-day ms for focus date */
	readonly focusDayMs: number;
	/** Is the focus date today? */
	readonly isToday: boolean;
	/** Is the focus date in the past? */
	readonly isPast: boolean;
	/** Is the focus date in the future? */
	readonly isFuture: boolean;
	/** Formatted date label (e.g. "Monday, April 14") */
	readonly dateLabel: string;
	/** Whether the adapter is loading */
	readonly loading: boolean;

	// ── Categorised events (reactive) ──

	/** All events for the focus day, sorted by start */
	readonly dayEvents: TimelineEvent[];
	/** All-day or multi-day events */
	readonly allDay: TimelineEvent[];
	/** Timed events that have ended (today only; empty for other days) */
	readonly past: TimelineEvent[];
	/** Timed events currently in progress */
	readonly current: TimelineEvent[];
	/** Timed events coming up */
	readonly upcoming: TimelineEvent[];
	/** Grouped upcoming slots (overlapping events merged) */
	readonly upcomingSlots: import('../views/shared/format.js').TimeSlot[];
	/** Total event count for the day */
	readonly count: number;

	// ── Format helpers ──

	/** Format a Date to locale time string (e.g. "2:30 PM" or "14:30") */
	fmtTime(date: Date): string;
	/** Format event duration (e.g. "1h 30m") */
	fmtDuration(event: TimelineEvent): string;
	/** Format time range (e.g. "14:00 – 15:30") */
	fmtRange(event: TimelineEvent): string;
	/** Time until event starts (e.g. "in 2h 15m") — live, updates every second */
	eta(event: TimelineEvent): string;
	/** Progress of an in-progress event (0–1) — live */
	progress(event: TimelineEvent): number;

	// ── Navigation ──

	/** Go to previous day */
	prev(): void;
	/** Go to next day */
	next(): void;
	/** Go to today */
	goToday(): void;
	/** Set focus to a specific date */
	setDate(date: Date): void;

	// ── Clock (live) ──

	/** Current epoch ms, ticks every second */
	readonly now: number;
	/** Formatted current time "HH:MM" */
	readonly timeLabel: string;
	/** Today's start-of-day ms */
	readonly todayMs: number;
}

// ─── Implementation ─────────────────────────────────────

export function createAgenda(options: AgendaOptions): HeadlessAgenda {
	const {
		initialDate,
		locale,
		lookahead = 7,
	} = options;

	const resolveAdapter = typeof options.adapter === 'function'
		? options.adapter as () => CalendarAdapter
		: () => options.adapter as CalendarAdapter;

	const store = createEventStore(resolveAdapter);
	const clock = createClock();

	// ── Focus date (reactive, writable) ──
	let focusDayMs = $state(sod(initialDate?.getTime() ?? Date.now()));

	$effect(() => {
		resolveAdapter();
		const start = new Date(focusDayMs);
		const end = new Date(focusDayMs + lookahead * DAY_MS);
		store.load({ start, end });
	});
	// Eager initial load
	untrack(() => {
		const start = new Date(focusDayMs);
		const end = new Date(focusDayMs + lookahead * DAY_MS);
		store.load({ start, end });
	});

	// ── Day derivations ──
	const dayEnd = $derived(focusDayMs + DAY_MS);
	const isToday = $derived(focusDayMs === clock.today);
	const isPast = $derived(focusDayMs < clock.today);
	const isFuture = $derived(focusDayMs > clock.today);

	const dateLabel = $derived(
		new Date(focusDayMs).toLocaleDateString(locale ?? undefined, {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
		})
	);

	const dayEvents = $derived.by((): TimelineEvent[] => {
		return store.events
			.filter((ev) => ev.start.getTime() < dayEnd && ev.end.getTime() > focusDayMs)
			.sort((a, b) => a.start.getTime() - b.start.getTime());
	});

	const allDay = $derived(dayEvents.filter((ev) => isAllDay(ev) || isMultiDay(ev)));
	const timed = $derived(dayEvents.filter((ev) => !isAllDay(ev) && !isMultiDay(ev)));

	const categorised = $derived.by(() => {
		const now = clock.tick;
		const past: TimelineEvent[] = [];
		const current: TimelineEvent[] = [];
		const upcoming: TimelineEvent[] = [];
		for (const ev of timed) {
			const s = ev.start.getTime();
			const e = ev.end.getTime();
			if (e <= now) past.push(ev);
			else if (s <= now && e > now) current.push(ev);
			else upcoming.push(ev);
		}
		return { past, current, upcoming, upcomingSlots: groupIntoSlots(upcoming) };
	});

	// ── Navigation ──
	function prev() { focusDayMs = focusDayMs - DAY_MS; }
	function next() { focusDayMs = focusDayMs + DAY_MS; }
	function goToday() { focusDayMs = clock.today; }
	function setDate(date: Date) { focusDayMs = sod(date.getTime()); }

	// ── Format helpers ──
	const fmtTime = (d: Date) => _fmtTime(d, locale);
	const fmtDur = (ev: TimelineEvent) => fmtDuration(ev.start, ev.end);
	const fmtRange = (ev: TimelineEvent) => `${_fmtTime(ev.start, locale)} – ${_fmtTime(ev.end, locale)}`;
	const eta = (ev: TimelineEvent) => timeUntilMs(ev.start.getTime(), clock.tick);
	const progress = (ev: TimelineEvent) => _progress(ev, clock.tick);

	return {
		// State
		get focusDate() { return new Date(focusDayMs); },
		get focusDayMs() { return focusDayMs; },
		get isToday() { return isToday; },
		get isPast() { return isPast; },
		get isFuture() { return isFuture; },
		get dateLabel() { return dateLabel; },
		get loading() { return store.loading; },

		// Events
		get dayEvents() { return dayEvents; },
		get allDay() { return allDay; },
		get past() { return categorised.past; },
		get current() { return categorised.current; },
		get upcoming() { return categorised.upcoming; },
		get upcomingSlots() { return categorised.upcomingSlots; },
		get count() { return dayEvents.length; },

		// Format helpers
		fmtTime,
		fmtDuration: fmtDur,
		fmtRange,
		eta,
		progress,

		// Navigation
		prev,
		next,
		goToday,
		setDate,

		// Clock
		get now() { return clock.tick; },
		get timeLabel() { return clock.hm; },
		get todayMs() { return clock.today; },
	};
}
