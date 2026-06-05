const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type WeekStart = 'sunday' | 'monday';
export type TimeFormatPref = 'auto' | '12h' | '24h';

function timeStyleOptions(pref: TimeFormatPref): Intl.DateTimeFormatOptions {
	const base: Intl.DateTimeFormatOptions = { timeStyle: 'short' };
	if (pref === '12h') return { ...base, hour12: true };
	if (pref === '24h') return { ...base, hour12: false };
	return base;
}

export function pad2(value: number): string {
	return value.toString().padStart(2, '0');
}

export function localTimeZone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
	} catch {
		return 'Etc/UTC';
	}
}

export function monthRange(year: number, month: number): { after: string; before: string } {
	const after = `${year}-${pad2(month + 1)}-01T00:00:00`;
	const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
	const before = `${nextMonth.year}-${pad2(nextMonth.month + 1)}-01T00:00:00`;
	return { after, before };
}

/** Six-week grid covering the month. */
export function monthGrid(year: number, month: number, weekStart: WeekStart = 'sunday'): Date[] {
	const firstOfMonth = new Date(year, month, 1);
	const start = new Date(firstOfMonth);
	const offset = weekStart === 'monday' ? (start.getDay() + 6) % 7 : start.getDay();
	start.setDate(start.getDate() - offset);

	const days: Date[] = [];
	for (let i = 0; i < 42; i++) {
		const day = new Date(start);
		day.setDate(start.getDate() + i);
		days.push(day);
	}
	return days;
}

export function weekdayLabels(weekStart: WeekStart = 'sunday'): string[] {
	if (weekStart === 'monday') {
		return [...WEEKDAY_LABELS.slice(1), WEEKDAY_LABELS[0]];
	}
	return WEEKDAY_LABELS;
}

export function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

export function isSameMonth(date: Date, year: number, month: number): boolean {
	return date.getFullYear() === year && date.getMonth() === month;
}

export function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

export function startOfWeek(date: Date, weekStart: WeekStart = 'sunday'): Date {
	const start = new Date(date);
	const offset = weekStart === 'monday' ? (start.getDay() + 6) % 7 : start.getDay();
	start.setDate(start.getDate() - offset);
	start.setHours(0, 0, 0, 0);
	return start;
}

export function weekDays(date: Date, weekStart: WeekStart = 'sunday'): Date[] {
	const start = startOfWeek(date, weekStart);
	return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function formatWeekRange(anchor: Date, weekStart: WeekStart = 'sunday'): string {
	const days = weekDays(anchor, weekStart);
	const start = days[0];
	const end = days[6];
	const sameMonth = start.getMonth() === end.getMonth();
	const sameYear = start.getFullYear() === end.getFullYear();

	const startLabel = new Intl.DateTimeFormat(undefined, {
		month: sameMonth ? undefined : 'short',
		day: 'numeric',
		year: sameYear ? undefined : 'numeric'
	}).format(start);

	const endLabel = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(end);

	return `${startLabel} – ${endLabel}`;
}

export function parseIsoDuration(duration: string): number {
	const match =
		/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(duration);
	if (!match) return 0;

	const days = Number(match[1] ?? 0);
	const hours = Number(match[2] ?? 0);
	const minutes = Number(match[3] ?? 0);
	const seconds = Number(match[4] ?? 0);

	return (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
}

export function formatMonthTitle(year: number, month: number): string {
	return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
		new Date(year, month, 1)
	);
}

/** Compact timestamp for message lists — time today, date otherwise. */
export function formatMessageListWhen(
	iso: string,
	full = false,
	timeFormat: TimeFormatPref = 'auto'
): string {
	const date = new Date(iso);
	const timeOpts = timeStyleOptions(timeFormat);
	if (full) {
		return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', ...timeOpts }).format(date);
	}

	const now = new Date();

	if (isSameDay(date, now)) {
		return new Intl.DateTimeFormat(undefined, timeOpts).format(date);
	}

	const weekAgo = new Date(now);
	weekAgo.setDate(now.getDate() - 6);
	if (date >= weekAgo) {
		return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
	}

	if (date.getFullYear() === now.getFullYear()) {
		return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
	}

	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(date);
}

/** Local calendar day key for grouping list rows (YYYY-MM-DD). */
export function simpleMessageDayKey(iso: string): string {
	const date = new Date(iso);
	return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Time only — Simple list row (day context uses a separate heading). */
export function formatSimpleListTime(
	iso: string,
	timeFormat: TimeFormatPref = 'auto'
): string {
	return new Intl.DateTimeFormat(undefined, timeStyleOptions(timeFormat)).format(new Date(iso));
}

/** Combined weekday + time for Simple list rows (no separate day headings). */
export function formatSimpleListWhen(
	iso: string,
	timeFormat: TimeFormatPref = 'auto'
): string {
	const date = new Date(iso);
	const time = new Intl.DateTimeFormat(undefined, timeStyleOptions(timeFormat)).format(date);
	const now = new Date();

	if (isSameDay(date, now)) {
		return time;
	}

	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (isSameDay(date, yesterday)) {
		return `Yesterday ${time}`;
	}

	const weekAgo = new Date(now);
	weekAgo.setDate(now.getDate() - 6);
	if (date >= weekAgo) {
		const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
		return `${weekday} ${time}`;
	}

	if (date.getFullYear() === now.getFullYear()) {
		const md = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
		return `${md} ${time}`;
	}

	const mdy = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(date);
	return `${mdy} ${time}`;
}

/** Label for a day divider row in the Simple message list. */
export function formatSimpleListDayHeading(iso: string): string {
	const date = new Date(iso);
	const now = new Date();

	if (isSameDay(date, now)) {
		return 'Today';
	}

	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (isSameDay(date, yesterday)) {
		return 'Yesterday';
	}

	const weekAgo = new Date(now);
	weekAgo.setDate(now.getDate() - 6);
	if (date >= weekAgo) {
		return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
	}

	if (date.getFullYear() === now.getFullYear()) {
		return new Intl.DateTimeFormat(undefined, {
			weekday: 'long',
			month: 'short',
			day: 'numeric'
		}).format(date);
	}

	return new Intl.DateTimeFormat(undefined, {
		weekday: 'long',
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(date);
}

export function formatEventTime(event: { start: Date; end: Date; allDay: boolean }): string {
	if (event.allDay) return 'All day';

	const sameDay = isSameDay(event.start, event.end);
	const dateOpts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' };
	const timeOpts: Intl.DateTimeFormatOptions = { timeStyle: 'short' };

	if (sameDay) {
		const date = new Intl.DateTimeFormat(undefined, dateOpts).format(event.start);
		const start = new Intl.DateTimeFormat(undefined, timeOpts).format(event.start);
		const end = new Intl.DateTimeFormat(undefined, timeOpts).format(event.end);
		return `${date} · ${start} – ${end}`;
	}

	const start = new Intl.DateTimeFormat(undefined, { ...dateOpts, ...timeOpts }).format(event.start);
	const end = new Intl.DateTimeFormat(undefined, { ...dateOpts, ...timeOpts }).format(event.end);
	return `${start} – ${end}`;
}

export function toDateInputValue(date: Date): string {
	return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function toDatetimeLocalValue(date: Date): string {
	return `${toDateInputValue(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function parseDateInputValue(value: string): Date {
	const [year, month, day] = value.split('-').map(Number);
	return new Date(year, month - 1, day);
}

export function parseDatetimeLocalValue(value: string): Date {
	const [datePart, timePart] = value.split('T');
	const [year, month, day] = datePart.split('-').map(Number);
	const [hours, minutes] = timePart.split(':').map(Number);
	return new Date(year, month - 1, day, hours, minutes);
}

export function durationBetween(start: Date, end: Date, allDay: boolean): string {
	if (allDay) {
		const days = Math.max(
			1,
			Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
		);
		return `P${days}D`;
	}

	const ms = Math.max(60_000, end.getTime() - start.getTime());
	const totalMinutes = Math.round(ms / 60_000);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	if (hours && minutes) return `PT${hours}H${minutes}M`;
	if (hours) return `PT${hours}H`;
	return `PT${minutes}M`;
}

export function defaultEventTimes(day = new Date()): { start: Date; end: Date } {
	const start = new Date(day);
	if (start.getHours() === 0 && start.getMinutes() === 0) {
		start.setHours(9, 0, 0, 0);
	}
	const end = new Date(start);
	end.setHours(start.getHours() + 1);
	return { start, end };
}
