/**
 * Shared format helpers for agenda views.
 * Extracted from duplicated code in AgendaDay and AgendaWeek.
 */
import type { TimelineEvent } from '../../core/types.js';
import { fmtTime as _fmtTime, fmtDuration, getLabels } from '../../core/locale.js';

export function fmtTime(d: Date, locale?: string): string {
	return _fmtTime(d, locale);
}

export function duration(ev: TimelineEvent): string {
	return fmtDuration(ev.start, ev.end);
}

export function timeUntilMs(ms: number, now: number): string {
	const L = getLabels();
	const diff = ms - now;
	if (diff <= 0) return L.now;
	const tMins = Math.floor(diff / 60000);
	if (tMins < 60) return `in ${tMins}m`;
	const hrs = Math.floor(tMins / 60);
	const rm = tMins % 60;
	if (hrs < 24) return rm > 0 ? `in ${hrs}h ${rm}m` : `in ${hrs}h`;
	const days = Math.floor(hrs / 24);
	return `in ${days}d`;
}

export function progress(ev: TimelineEvent, now: number): number {
	const s = ev.start.getTime();
	const e = ev.end.getTime();
	return Math.min(1, Math.max(0, (now - s) / (e - s)));
}

/**
 * Group overlapping events into time slots.
 * Used by both AgendaDay and AgendaWeek.
 */
export interface TimeSlot {
	startMs: number;
	endMs: number;
	events: TimelineEvent[];
}

export function groupIntoSlots(evts: TimelineEvent[]): TimeSlot[] {
	const sorted = [...evts].sort((a, b) => a.start.getTime() - b.start.getTime());
	const slots: TimeSlot[] = [];
	for (const ev of sorted) {
		const last = slots[slots.length - 1];
		if (last && ev.start.getTime() < last.endMs) {
			last.events.push(ev);
			last.endMs = Math.max(last.endMs, ev.end.getTime());
		} else {
			slots.push({
				startMs: ev.start.getTime(),
				endMs: ev.end.getTime(),
				events: [ev],
			});
		}
	}
	return slots;
}
