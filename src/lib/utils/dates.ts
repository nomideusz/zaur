const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

/** Six-week grid covering the month (Sunday-start). */
export function monthGrid(year: number, month: number): Date[] {
	const firstOfMonth = new Date(year, month, 1);
	const start = new Date(firstOfMonth);
	start.setDate(start.getDate() - start.getDay());

	const days: Date[] = [];
	for (let i = 0; i < 42; i++) {
		const day = new Date(start);
		day.setDate(start.getDate() + i);
		days.push(day);
	}
	return days;
}

export function weekdayLabels(): string[] {
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
