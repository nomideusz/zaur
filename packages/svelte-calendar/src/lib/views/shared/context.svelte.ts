/**
 * Shared context reader for calendar views.
 *
 * Calendar.svelte sets a single 'calendar' context with reactive getters.
 * This module reads it and returns a typed interface for views.
 */
import { getContext } from 'svelte';
import type { Snippet } from 'svelte';
import type { TimelineEvent, BlockedSlot } from '../../core/types.js';
import type { DragState } from '../../engine/drag.svelte.js';
import type { ViewState } from '../../engine/view-state.svelte.js';
import type { Selection } from '../../engine/selection.svelte.js';
import type { EventStore } from '../../engine/event-store.svelte.js';
import { sod } from '../../core/time.js';

/** The shape of the single context object set by Calendar.svelte */
interface CalendarContextRaw {
	// Engine
	readonly store: EventStore;
	readonly viewState: ViewState;
	readonly selection: Selection;
	readonly drag: DragState;
	readonly commitDrag: () => void;

	// Callbacks
	readonly oneventclick?: (event: TimelineEvent) => void;
	readonly oneventcreate?: (range: { start: Date; end: Date }) => void;
	readonly oneventmove?: (event: TimelineEvent, newStart: Date, newEnd: Date) => void;
	readonly oneventhover?: (event: TimelineEvent) => void;

	// Config
	readonly readOnly: boolean;
	readonly visibleHours?: [number, number];
	readonly snapInterval: number;
	readonly eventSnippet?: Snippet<[TimelineEvent]>;
	readonly emptySnippet?: Snippet;
	readonly showNavigation: boolean;
	readonly equalDays: boolean;
	readonly showDates: boolean;
	readonly hideDays?: number[];
	readonly blockedSlots?: BlockedSlot[];
	readonly dayHeaderSnippet?: Snippet<[{ date: Date; isToday: boolean; dayName: string }]>;
	readonly minDuration?: number;
	readonly maxDuration?: number;
	readonly disabledDates?: Date[];
	readonly mobile: boolean;
	readonly autoHeight: boolean;
	readonly compact: boolean;

	// Load range (read/write)
	readonly loadRange: { start: Date; end: Date } | null;
	setLoadRange(range: { start: Date; end: Date } | null): void;
}

export interface CalendarContext {
	readonly viewState: ViewState | undefined;
	readonly drag: DragState | undefined;
	readonly commitDrag: (() => void) | undefined;
	readonly snapInterval: number;
	readonly showNav: boolean;
	readonly equalDays: boolean;
	readonly showDates: boolean;
	readonly hideDays: number[] | undefined;
	readonly isMobile: boolean;
	readonly autoHeight: boolean;
	readonly compact: boolean;
	readonly readOnly: boolean;
	readonly blockedSlots: BlockedSlot[] | undefined;
	readonly dayHeaderSnippet: Snippet<[{ date: Date; isToday: boolean; dayName: string }]> | undefined;
	readonly minDuration: number | undefined;
	readonly maxDuration: number | undefined;
	readonly oneventhover: ((event: TimelineEvent) => void) | undefined;
	readonly disabledDates: Date[] | undefined;
	readonly disabledSet: Set<number>;
	readonly loadRange: { current: { start: Date; end: Date } | null; set: (r: { start: Date; end: Date } | null) => void } | undefined;
	readonly eventSnippet: Snippet<[TimelineEvent]> | undefined;
	readonly emptySnippet: Snippet | undefined;
}

/**
 * Read the calendar context.
 * Call at component init time (top-level script).
 * Returns an object with getters that delegate to the raw context.
 */
export function useCalendarContext(): CalendarContext {
	const raw = getContext<CalendarContextRaw>('calendar') as CalendarContextRaw | undefined;

	return {
		get viewState() { return raw?.viewState; },
		get drag() { return raw?.drag; },
		get commitDrag() { return raw?.commitDrag; },
		get snapInterval() { return raw?.snapInterval ?? 15; },
		get showNav() { return raw?.showNavigation ?? true; },
		get equalDays() { return raw?.equalDays ?? false; },
		get showDates() { return raw?.showDates ?? true; },
		get hideDays() { return raw?.hideDays; },
		get isMobile() { return raw?.mobile ?? false; },
		get autoHeight() { return raw?.autoHeight ?? false; },
		get compact() { return raw?.compact ?? false; },
		get readOnly() { return raw?.readOnly ?? false; },
		get blockedSlots() { return raw?.blockedSlots; },
		get dayHeaderSnippet() { return raw?.dayHeaderSnippet; },
		get minDuration() { return raw?.minDuration; },
		get maxDuration() { return raw?.maxDuration; },
		get oneventhover() { return raw?.oneventhover; },
		get disabledDates() { return raw?.disabledDates; },
		get disabledSet() { return new Set(raw?.disabledDates?.map(d => sod(d.getTime())) ?? []); },
		get loadRange() {
			if (!raw) return undefined;
			return {
				get current() { return raw.loadRange; },
				set: (r: { start: Date; end: Date } | null) => raw.setLoadRange(r),
			};
		},
		get eventSnippet() { return raw?.eventSnippet; },
		get emptySnippet() { return raw?.emptySnippet; },
	};
}
