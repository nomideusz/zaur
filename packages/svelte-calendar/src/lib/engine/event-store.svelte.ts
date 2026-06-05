/**
 * Reactive event store — the CRUD brain of the calendar.
 *
 * Wraps a CalendarAdapter and exposes Svelte 5 rune-mode reactive state.
 * All mutations go through the adapter first, then update local state.
 *
 * Usage:
 *   const store = createEventStore(adapter);
 *   // store.events       — all loaded events (reactive)
 *   // store.forRange()   — query by date range
 *   // store.forDay()     — query single day
 *   // store.add()        — create event
 *   // store.update()     — patch event
 *   // store.remove()     — delete event
 *   // store.move()       — drag-move shorthand
 *   // store.load()       — fetch from adapter for a range
 */
import { SvelteMap } from 'svelte/reactivity';
import type { TimelineEvent } from '../core/types.js';
import type { CalendarAdapter, DateRange } from '../adapters/types.js';
import { sod, DAY_MS } from '../core/time.js';

export interface EventStore {
	/** All currently loaded events (reactive) */
	readonly events: TimelineEvent[];
	/** Whether a load/mutation is in-flight */
	readonly loading: boolean;
	/** Last error, if any */
	readonly error: string | null;

	/** Load events from the adapter for a date range */
	load(range: DateRange): Promise<void>;
	/** Get events overlapping a date range (client-side filter) */
	forRange(start: Date, end: Date): TimelineEvent[];
	/** Get events for a single day */
	forDay(date: Date): TimelineEvent[];
	/** Get a single event by ID */
	byId(id: string): TimelineEvent | undefined;

	/** Create a new event */
	add(event: Omit<TimelineEvent, 'id'>): Promise<TimelineEvent>;
	/** Patch an existing event */
	update(id: string, patch: Partial<TimelineEvent>): Promise<void>;
	/** Delete an event */
	remove(id: string): Promise<void>;
	/** Move an event to a new time range (drag shorthand) */
	move(id: string, newStart: Date, newEnd: Date): Promise<void>;
}

/**
 * Create a reactive event store backed by a CalendarAdapter.
 */
export function createEventStore(adapterOrGetter: CalendarAdapter | (() => CalendarAdapter)): EventStore {
	const getAdapter = () => typeof adapterOrGetter === 'function' ? adapterOrGetter() : adapterOrGetter;
	let lastAdapter = getAdapter();

	let eventMap = new SvelteMap<string, TimelineEvent>();
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Derived array view of the map — consumers read this.
	const eventArray = $derived([...eventMap.values()]);

	// ── Internal helpers ──
	function overlaps(ev: TimelineEvent, start: Date, end: Date): boolean {
		return ev.start < end && ev.end > start;
	}

	function removeEvent(id: string): void {
		eventMap.delete(id);
	}

	// ── Public API ──
	function upsertEvent(ev: TimelineEvent): void {
		eventMap.set(ev.id, ev);
	}

	return {
		get events() {
			return eventArray;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},

		async load(range: DateRange) {
			const currentAdapter = getAdapter();
			if (currentAdapter !== lastAdapter) {
				lastAdapter = currentAdapter;
				eventMap.clear();
			}
			loading = true;
			error = null;
			try {
				const fetched = await currentAdapter.fetchEvents(range);
				// Merge: upsert fetched, don't blow away events outside this range
				for (const ev of fetched) {
					upsertEvent(ev);
				}
			} catch (e) {
				error = e instanceof Error ? e.message : String(e);
			} finally {
				loading = false;
			}
		},

		forRange(start: Date, end: Date): TimelineEvent[] {
			return eventArray.filter((ev) => overlaps(ev, start, end));
		},

		forDay(date: Date): TimelineEvent[] {
			const dayStart = new Date(sod(date.getTime()));
			const dayEnd = new Date(dayStart.getTime() + DAY_MS);
			return eventArray.filter((ev) => overlaps(ev, dayStart, dayEnd));
		},

		byId(id: string): TimelineEvent | undefined {
			return eventMap.get(id);
		},

		async add(eventData: Omit<TimelineEvent, 'id'>): Promise<TimelineEvent> {
			const currentAdapter = getAdapter();
			if (!currentAdapter.createEvent) throw new Error('Adapter is read-only: createEvent not implemented');
			loading = true;
			error = null;
			try {
				const created = await currentAdapter.createEvent(eventData);
				upsertEvent(created);
				return created;
			} catch (e) {
				error = e instanceof Error ? e.message : String(e);
				throw e;
			} finally {
				loading = false;
			}
		},

		async update(id: string, patch: Partial<TimelineEvent>): Promise<void> {
			const currentAdapter = getAdapter();
			if (!currentAdapter.updateEvent) throw new Error('Adapter is read-only: updateEvent not implemented');
			loading = true;
			error = null;
			try {
				const updated = await currentAdapter.updateEvent(id, patch);
				upsertEvent(updated);
			} catch (e) {
				error = e instanceof Error ? e.message : String(e);
				throw e;
			} finally {
				loading = false;
			}
		},

		async remove(id: string): Promise<void> {
			const currentAdapter = getAdapter();
			if (!currentAdapter.deleteEvent) throw new Error('Adapter is read-only: deleteEvent not implemented');
			loading = true;
			error = null;
			try {
				await currentAdapter.deleteEvent(id);
				removeEvent(id);
			} catch (e) {
				error = e instanceof Error ? e.message : String(e);
				throw e;
			} finally {
				loading = false;
			}
		},

		async move(id: string, newStart: Date, newEnd: Date): Promise<void> {
			// Optimistic update: apply locally first so the UI doesn't flash
			// back to the old position between drag.commit() and adapter response.
			const existing = eventMap.get(id);
			if (existing) {
				upsertEvent({ ...existing, start: newStart, end: newEnd });
			}
			try {
				await this.update(id, { start: newStart, end: newEnd });
			} catch (e) {
				// Revert optimistic update on failure
				if (existing) upsertEvent(existing);
				throw e;
			}
		},
	};
}
