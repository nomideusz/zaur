const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type WeekStart = 'sunday' | 'monday';

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
export function formatMessageListWhen(iso: string, full = false): string {
	const date = new Date(iso);
	if (full) {
		return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
	}

	const now = new Date();

	if (isSameDay(date, now)) {
		return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(date);
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
