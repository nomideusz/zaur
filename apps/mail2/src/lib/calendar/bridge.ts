/**
 * What `@nomideusz/svelte-calendar` needs from us, and what our design gives it
 * back: an adapter over the JMAP remote functions, and the theme that makes the
 * grid wear the shell's tokens instead of its own.
 */
import type { CalendarEvent } from '@zaur/mail-core';
import type { TimelineEvent } from '@nomideusz/svelte-calendar';

/**
 * The shell's palette, in the calendar's variable names. Every value is a
 * reference rather than a colour, so the grid follows `data-theme` and the OS
 * preference through the same tokens every other surface reads — one string,
 * both modes, no probing of the host page.
 *
 * One face throughout: the grid's "mono" slot gets the sans too (its times are
 * already tabular), and a weekend is a day like any other — the colour on this
 * page belongs to the events.
 */
export const ZAUR_THEME = `
	--dt-stage-bg: var(--z-surface);
	--dt-bg: var(--z-surface);
	--dt-surface: var(--z-canvas);
	--dt-border: var(--z-hairline);
	--dt-border-day: var(--z-sunken);
	--dt-text: var(--z-ink);
	--dt-text-2: var(--z-muted);
	--dt-text-3: var(--z-soft);
	--dt-accent: var(--z-accent);
	--dt-accent-dim: var(--z-accent-soft);
	--dt-glow: var(--z-accent-line);
	--dt-today-bg: var(--z-accent-faint);
	--dt-btn-text: var(--z-accent-fg);
	--dt-scrollbar: var(--z-line);
	--dt-success: var(--z-ch-confirmed-solid);
	--dt-weekend-bg: transparent;
	--dt-hover: var(--z-hover);
	--dt-sans: var(--font-sans);
	--dt-mono: var(--font-sans);
`;

/** The event a drag came back with, so a move can be turned into a JMAP patch. */
export interface EventPayload {
	source: CalendarEvent;
}

export function toTimelineEvent(event: CalendarEvent, color: string): TimelineEvent {
	return {
		id: event.id,
		title: event.title,
		start: event.start,
		end: event.end,
		allDay: event.allDay,
		color,
		location: event.location,
		// The grid hands this straight back on click and on drop; a JMAP write
		// needs the account, the calendars it is filed in and the series id,
		// none of which survive the trip as a `TimelineEvent`.
		data: { source: event } satisfies EventPayload
	};
}

export function sourceOf(event: TimelineEvent): CalendarEvent | null {
	const data = event.data as EventPayload | undefined;
	return data?.source ?? null;
}
