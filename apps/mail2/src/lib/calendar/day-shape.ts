/**
 * The time between events, which is what most of a calendar is and what the
 * big ones never draw: how long is free, and what comes after it.
 */

interface Timed {
	start: Date;
	end: Date;
	allDay: boolean;
	title: string;
}

export interface Gap {
	start: Date;
	end: Date;
	minutes: number;
}

/** Busy stretches of one day, overlaps merged. All-day events take no time. */
function busy(events: Timed[], dayStart: Date, dayEnd: Date): [number, number][] {
	const spans = events
		.filter((event) => !event.allDay && event.end > dayStart && event.start < dayEnd)
		.map((event): [number, number] => [Math.max(+event.start, +dayStart), Math.min(+event.end, +dayEnd)])
		.sort((a, b) => a[0] - b[0]);
	const merged: [number, number][] = [];
	for (const span of spans) {
		const last = merged[merged.length - 1];
		if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
		else merged.push([...span]);
	}
	return merged;
}

/**
 * The free stretches between a day's first event and its last, `min` minutes
 * or longer, inside waking `hours`: the night after a late deploy is sleep, not
 * free time. Before the first and after the last is open day, not a gap: it
 * stays the empty canvas a drag creates on.
 */
export function dayGaps(events: Timed[], day: Date, min = 30, hours: [number, number] = [7, 22]): Gap[] {
	const at = (hour: number) => +new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour);
	const spans = busy(events, new Date(at(0)), new Date(at(24)));
	const gaps: Gap[] = [];
	for (let i = 1; i < spans.length; i++) {
		const start = Math.max(spans[i - 1]![1], at(hours[0]));
		const end = Math.min(spans[i]![0], at(hours[1]));
		const minutes = Math.round((end - start) / 60_000);
		if (minutes >= min) gaps.push({ start: new Date(start), end: new Date(end), minutes });
	}
	return gaps;
}

export type DayVoice<T extends Timed> =
	| { kind: 'now'; event: T; left: number; next: T | null }
	| { kind: 'free'; until: Date; minutes: number; next: T }
	| { kind: 'later'; next: T }
	| { kind: 'clear' };

/**
 * What the day says at this moment: in something (and for how long), free
 * (until what), or done for today (and what comes next). `events` are the
 * coming week's; all-day ones never make you busy.
 */
export function dayVoice<T extends Timed>(events: T[], now: Date): DayVoice<T> {
	const timed = events.filter((event) => !event.allDay && event.end > now).sort((a, b) => +a.start - +b.start);
	const current = timed.filter((event) => event.start <= now);
	if (current.length) {
		// The one ending soonest is the one to watch.
		const event = current.reduce((a, b) => (b.end < a.end ? b : a));
		const next = timed.find((other) => other.start >= event.end) ?? null;
		return { kind: 'now', event, left: Math.ceil((+event.end - +now) / 60_000), next };
	}
	const next = timed[0];
	if (!next) return { kind: 'clear' };
	const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
	if (next.start < endOfToday) return { kind: 'free', until: next.start, minutes: Math.round((+next.start - +now) / 60_000), next };
	return { kind: 'later', next };
}

/** "45 min", "1 h", "1 h 45": the length of a stretch, as said aloud. */
export function span(minutes: number): string {
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest ? `${hours} h ${rest}` : `${hours} h`;
}
